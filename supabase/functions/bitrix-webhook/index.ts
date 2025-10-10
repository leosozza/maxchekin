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

    const payload = await req.json();
    console.log("Received Bitrix webhook:", payload);

    const { lead_id, stage_id, model_name, model_photo, room } = payload;

    // Find the panel associated with this stage
    const { data: panel } = await supabaseClient
      .from("panels")
      .select("id")
      .eq("bitrix_stage_id", stage_id)
      .single();

    if (!panel) {
      console.log("No panel found for stage:", stage_id);
      return new Response(
        JSON.stringify({ error: "Panel not found for this stage" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a new call
    const { data: call, error } = await supabaseClient
      .from("calls")
      .insert({
        panel_id: panel.id,
        lead_id,
        model_name,
        model_photo,
        room,
        status: "calling",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating call:", error);
      throw error;
    }

    console.log("Call created successfully:", call);

    return new Response(
      JSON.stringify({ success: true, call }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
