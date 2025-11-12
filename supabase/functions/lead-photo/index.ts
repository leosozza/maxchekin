// Supabase Edge Function to proxy Bitrix lead photo
// - Fetch active webhook from DB (webhook_config)
// - Get the downloadUrl directly from the lead photo field
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

// Type for potential file values from Bitrix
type BitrixFieldValue =
  | string
  | number
  | { downloadUrl?: string }
  | Array<{ downloadUrl?: string }>;

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

    console.log(`[LEAD-PHOTO] Buscando lead ${leadId} no Bitrix...`);

    // 1) Buscar o Lead
    const leadResp = await fetch(
      `${bitrixWebhook}/crm.lead.get.json?id=${encodeURIComponent(leadId)}`
    );
    if (!leadResp.ok) {
      console.error(`[LEAD-PHOTO] crm.lead.get falhou: ${leadResp.status}`);
      return new Response(JSON.stringify({ error: `crm.lead.get falhou: ${leadResp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const leadJson = await leadResp.json();
    const lead = leadJson?.result;
    if (!lead) {
      console.error(`[LEAD-PHOTO] Lead ${leadId} não encontrado`);
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[LEAD-PHOTO] Lead ${leadId} encontrado, extraindo foto do campo ${fieldName}`);

    // 2) Extrair downloadUrl do campo de foto
    const fieldValue: BitrixFieldValue = (lead as any)[fieldName];
    let downloadUrl: string | undefined;

    if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      const firstItem = fieldValue[0];
      downloadUrl = firstItem?.downloadUrl;
    } else if (fieldValue && typeof fieldValue === "object") {
      const objValue = fieldValue as { downloadUrl?: string };
      downloadUrl = objValue.downloadUrl;
    }

    if (!downloadUrl) {
      console.error(`[LEAD-PHOTO] Nenhuma downloadUrl encontrada no campo ${fieldName}`);
      return new Response(
        JSON.stringify({ error: "Nenhuma foto encontrada no campo informado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[LEAD-PHOTO] downloadUrl relativa encontrada:`, downloadUrl);

    // 3) Construir URL completa (downloadUrl do Bitrix é relativa)
    let fullDownloadUrl = downloadUrl;
    if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
      // URL relativa, construir URL completa usando o domínio do webhook
      const webhookUrl = new URL(bitrixWebhook);
      const baseUrl = `${webhookUrl.protocol}//${webhookUrl.host}`;
      fullDownloadUrl = `${baseUrl}${downloadUrl}`;
    }

    console.log(`[LEAD-PHOTO] URL completa para download:`, fullDownloadUrl);

    // 4) Baixar e retransmitir a imagem
    const imgResp = await fetch(fullDownloadUrl);
    if (!imgResp.ok || !imgResp.body) {
      console.error(`[LEAD-PHOTO] Falha ao baixar imagem. Status: ${imgResp.status}`);
      return new Response(
        JSON.stringify({ error: `Falha ao baixar a imagem (${imgResp.status})` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[LEAD-PHOTO] Imagem baixada com sucesso, retransmitindo...`);

    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", imgResp.headers.get("content-type") ?? "application/octet-stream");
    headers.set("Cache-Control", "public, max-age=300, s-maxage=600");

    return new Response(imgResp.body, { status: 200, headers });
  } catch (err) {
    console.error("[LEAD-PHOTO] Erro interno:", err);
    return new Response(JSON.stringify({ error: "Erro interno ao servir a foto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
