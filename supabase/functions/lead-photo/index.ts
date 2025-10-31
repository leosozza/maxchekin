// Supabase Edge Function to proxy Bitrix lead photo
// - Fetch active webhook from DB (webhook_config)
// - Resolve the lead's fileId from the configured "Foto" field
// - Get a signed DOWNLOAD_URL via disk.file.get
// - Stream the image to the client with CORS and short cache

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Default Bitrix photo field
const DEFAULT_PHOTO_FIELD = "UF_CRM_LEAD_1733231445171";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Type for potential file ID values from Bitrix
type BitrixFieldValue =
  | string
  | number
  | { id?: string | number; ID?: string | number }
  | Array<{ id?: string | number; ID?: string | number }>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId")?.trim();
    const fieldName = url.searchParams.get("fieldName")?.trim() || DEFAULT_PHOTO_FIELD;

    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "SUPABASE env vars ausentes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Load active Bitrix webhook URL from DB
    const { data: config, error } = await supabase
      .from("webhook_config")
      .select("bitrix_webhook_url")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao ler webhook_config:", error);
    }

    const bitrixWebhook = config?.bitrix_webhook_url?.replace(/\/$/, "");
    if (!bitrixWebhook) {
      return new Response(JSON.stringify({ error: "Webhook do Bitrix não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Buscar o Lead
    const leadResp = await fetch(
      `${bitrixWebhook}/crm.lead.get.json?id=${encodeURIComponent(leadId)}`
    );
    if (!leadResp.ok) {
      return new Response(JSON.stringify({ error: `crm.lead.get falhou: ${leadResp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const leadJson = await leadResp.json();
    const lead = leadJson?.result;
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Extrair fileId do campo de foto
    const fieldValue: BitrixFieldValue = (lead as any)[fieldName];
    let fileId: number | string | undefined;

    if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      fileId = fieldValue[0]?.id ?? fieldValue[0]?.ID;
    } else if (fieldValue && typeof fieldValue === "object") {
      fileId = (fieldValue as any).id ?? (fieldValue as any).ID;
    } else if (typeof fieldValue === "string" || typeof fieldValue === "number") {
      fileId = fieldValue;
    }

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: "Nenhuma foto encontrada no campo informado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3) Obter URL de download assinada
    const metaResp = await fetch(`${bitrixWebhook}/disk.file.get.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: fileId }),
    });
    if (!metaResp.ok) {
      return new Response(JSON.stringify({ error: `disk.file.get falhou: ${metaResp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const metaJson = await metaResp.json();
    const downloadUrl: string | undefined = metaJson?.result?.DOWNLOAD_URL;
    if (!downloadUrl) {
      return new Response(JSON.stringify({ error: "DOWNLOAD_URL indisponível" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Baixar e retransmitir a imagem
    const imgResp = await fetch(downloadUrl);
    if (!imgResp.ok || !imgResp.body) {
      return new Response(
        JSON.stringify({ error: `Falha ao baixar a imagem (${imgResp.status})` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", imgResp.headers.get("content-type") ?? "application/octet-stream");
    headers.set("Cache-Control", "public, max-age=300, s-maxage=600");

    return new Response(imgResp.body, { status: 200, headers });
  } catch (err) {
    console.error("lead-photo error:", err);
    return new Response(JSON.stringify({ error: "Erro interno ao servir a foto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});