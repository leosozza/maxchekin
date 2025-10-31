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

/**
 * Extract fileId from a Bitrix URL (showUrl or downloadUrl)
 * Handles both absolute and relative URLs
 * @param url - The URL to extract the fileId from (can be absolute or relative)
 * @param bitrixWebhook - The Bitrix webhook base URL used to construct absolute URLs from relative ones
 * @returns The extracted fileId as a number (if numeric) or string, or undefined if not found
 */
function extractFileIdFromUrl(url: string | undefined, bitrixWebhook: string): string | number | undefined {
  if (!url) return undefined;
  
  try {
    // Handle relative URLs by combining with webhook base
    let fullUrl: URL;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      fullUrl = new URL(url);
    } else {
      // Extract base domain from webhook URL
      const webhookUrl = new URL(bitrixWebhook);
      const baseUrl = `${webhookUrl.protocol}//${webhookUrl.host}`;
      fullUrl = new URL(url, baseUrl);
    }
    
    // Try to extract fileId from query parameter
    const fileId = fullUrl.searchParams.get('fileId') || fullUrl.searchParams.get('id');
    if (fileId) {
      // Return as number if it's numeric, otherwise as string
      const numericId = parseInt(fileId, 10);
      return isNaN(numericId) ? fileId : numericId;
    }
  } catch (error) {
    console.error("Error parsing URL for fileId:", error);
  }
  
  return undefined;
}

// Type for potential file ID values from Bitrix
type BitrixFieldValue =
  | string
  | number
  | { id?: string | number; ID?: string | number; showUrl?: string; downloadUrl?: string }
  | Array<{ id?: string | number; ID?: string | number; showUrl?: string; downloadUrl?: string }>;

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
      const firstItem = fieldValue[0];
      // Try to get id/ID first, then extract from URLs if not found
      fileId = firstItem?.id ?? firstItem?.ID ?? 
               extractFileIdFromUrl(firstItem?.showUrl, bitrixWebhook) ?? 
               extractFileIdFromUrl(firstItem?.downloadUrl, bitrixWebhook);
    } else if (fieldValue && typeof fieldValue === "object") {
      const objValue = fieldValue as { id?: string | number; ID?: string | number; showUrl?: string; downloadUrl?: string };
      // Try to get id/ID first, then extract from URLs if not found
      fileId = objValue.id ?? objValue.ID ?? 
               extractFileIdFromUrl(objValue.showUrl, bitrixWebhook) ?? 
               extractFileIdFromUrl(objValue.downloadUrl, bitrixWebhook);
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