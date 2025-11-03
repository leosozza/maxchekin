import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { webhook_url, lead_id, stage_name, event_type, card_data } = await req.json();

    console.log(`Calling webhook for lead ${lead_id} - ${event_type} stage ${stage_name}`);

    // Preparar payload para o webhook
    const payload = {
      event: event_type, // 'enter' ou 'exit'
      lead_id,
      stage_name,
      timestamp: new Date().toISOString(),
      ...card_data,
    };

    // Chamar o webhook
    const webhookResponse = await fetch(webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const webhookResult = await webhookResponse.text();

    console.log(`Webhook response (${webhookResponse.status}):`, webhookResult);

    return new Response(
      JSON.stringify({ 
        success: webhookResponse.ok, 
        status: webhookResponse.status,
        response: webhookResult 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error calling webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
