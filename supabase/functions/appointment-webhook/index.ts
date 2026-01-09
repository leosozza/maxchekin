import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Webhook endpoint for receiving appointment data from Bitrix24
 * 
 * Expected payload:
 * {
 *   client_name: string,
 *   phone: string,
 *   bitrix_id: string,
 *   model_name: string,
 *   scheduled_date: string (YYYY-MM-DD),
 *   scheduled_time: string (H:MM or HH:MM, accepts both single and double-digit hours),
 *   telemarketing_name: string,
 *   source: "Scouter" | "Meta",
 *   scouter_name: string,
 *   latitude: number,
 *   longitude: number
 * }
 */
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
    console.log("Received appointment webhook:", payload);

    // Validate required fields
    const requiredFields = [
      'client_name', 
      'phone', 
      'bitrix_id', 
      'model_name', 
      'scheduled_date', 
      'scheduled_time'
    ];

    for (const field of requiredFields) {
      if (!payload[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Parse and validate time (accepts both "9:00" and "09:00" format)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(payload.scheduled_time)) {
      return new Response(
        JSON.stringify({ error: "Invalid time format. Expected H:MM or HH:MM (e.g., 9:00 or 09:00)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(payload.scheduled_date)) {
      return new Response(
        JSON.stringify({ error: "Invalid date format. Expected YYYY-MM-DD" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate source if provided
    if (payload.source && !['Scouter', 'Meta'].includes(payload.source)) {
      return new Response(
        JSON.stringify({ error: "Invalid source. Must be 'Scouter' or 'Meta'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert appointment into database
    const { data: appointment, error } = await supabaseClient
      .from("appointments")
      .insert({
        client_name: payload.client_name,
        phone: payload.phone,
        bitrix_id: payload.bitrix_id,
        model_name: payload.model_name,
        scheduled_date: payload.scheduled_date,
        scheduled_time: payload.scheduled_time,
        telemarketing_name: payload.telemarketing_name || null,
        source: payload.source || null,
        scouter_name: payload.scouter_name || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating appointment:", error);
      throw error;
    }

    console.log("Appointment created successfully:", appointment);

    return new Response(
      JSON.stringify({ success: true, appointment }),
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
