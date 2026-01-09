import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default project ID for commercial project (PARENT_ID_1120 in Bitrix)
const DEFAULT_PROJECT_ID = 4;

/**
 * Webhook endpoint for receiving appointment data from Bitrix24
 * 
 * Accepts both query parameters (GET) and JSON body (POST)
 * 
 * Query params format (from Bitrix):
 * ?lead_id={{ID}}&modelo={{Nome do Modelo}}&responsible_name={{Nome do Responsável}}
 * &event_date={{Data do agendamento}}&Hora={{Data e Hora do agendamento}}
 * &Telemarketing={{Op Telemarketing}}&scouter={{Scouter}}&local={{Geolocalização}}
 * &phone={{Telefone}}&client_name={{Nome}}
 * 
 * JSON body format:
 * {
 *   client_name: string,
 *   phone: string,
 *   bitrix_id: string,
 *   model_name: string,
 *   scheduled_date: string (YYYY-MM-DD),
 *   scheduled_time: string (H:MM or HH:MM),
 *   telemarketing_name: string,
 *   source: "Scouter" | "Meta",
 *   scouter_name: string,
 *   latitude: number,
 *   longitude: number,
 *   project_id: string | number (optional, defaults to 4 for "Projeto Comercial")
 * }
 * 
 * Note: All times are assumed to be in Brazil/America/Sao_Paulo timezone (UTC-3)
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

    let payload: Record<string, any> = {};

    // Parse query parameters for GET requests or URL params
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    // If we have query params, use them
    if (Object.keys(queryParams).length > 0) {
      console.log("Received query params:", queryParams);
      
      // Map Bitrix field names to our schema
      // Parse geolocation from "local" field (format: "lat,lng" or "lat, lng")
      let latitude: number | null = null;
      let longitude: number | null = null;
      
      if (queryParams.local) {
        const coords = queryParams.local.split(",").map((c: string) => c.trim());
        if (coords.length === 2) {
          latitude = parseFloat(coords[0]) || null;
          longitude = parseFloat(coords[1]) || null;
        }
      }

      // Parse date and time from Bitrix fields
      // event_date format might be: "DD.MM.YYYY" or "YYYY-MM-DD"
      // Hora format might be: "DD.MM.YYYY HH:MM:SS" or "HH:MM"
      let scheduledDate = "";
      let scheduledTime = "";

      // Try to parse event_date
      if (queryParams.event_date) {
        const dateStr = queryParams.event_date;
        // Check if it's DD.MM.YYYY format
        if (dateStr.includes(".")) {
          const parts = dateStr.split(".");
          if (parts.length >= 3) {
            scheduledDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        } else if (dateStr.includes("-")) {
          // Already in YYYY-MM-DD format
          scheduledDate = dateStr;
        }
      }

      // Try to parse Hora (time)
      if (queryParams.Hora) {
        const horaStr = queryParams.Hora;
        // Check if it contains both date and time (e.g., "25.12.2024 17:00:00")
        if (horaStr.includes(" ")) {
          const timePart = horaStr.split(" ")[1];
          if (timePart) {
            // Extract HH:MM from HH:MM:SS
            scheduledTime = timePart.substring(0, 5);
          }
        } else if (horaStr.includes(":")) {
          // Just time format (HH:MM or HH:MM:SS)
          scheduledTime = horaStr.substring(0, 5);
        }
      }

      // Determine source based on scouter field
      let source: string | null = null;
      if (queryParams.scouter && queryParams.scouter.trim() !== "") {
        source = "Scouter";
      }

      // Project ID - defaults to DEFAULT_PROJECT_ID (Projeto Comercial) if not specified
      const projectId = queryParams.project_id || queryParams.PARENT_ID_1120 || DEFAULT_PROJECT_ID;

      payload = {
        client_name: queryParams.client_name || queryParams.modelo || "Cliente",
        phone: queryParams.phone || queryParams.telefone || null,
        bitrix_id: queryParams.lead_id || queryParams.bitrix_id || "",
        model_name: queryParams.modelo || queryParams.model_name || "",
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        telemarketing_name: queryParams.Telemarketing || queryParams.telemarketing_name || null,
        source: source,
        scouter_name: queryParams.scouter || queryParams.scouter_name || null,
        latitude: latitude,
        longitude: longitude,
        project_id: projectId,
      };
    } else if (req.method === "POST") {
      // Parse JSON body for POST requests
      payload = await req.json();
    }

    console.log("Processed payload:", payload);

    // Validate required fields
    const requiredFields = ['bitrix_id', 'model_name', 'scheduled_date', 'scheduled_time'];
    const missingFields = [];

    for (const field of requiredFields) {
      if (!payload[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields);
      return new Response(
        JSON.stringify({ 
          error: `Missing required fields: ${missingFields.join(", ")}`,
          received_params: queryParams,
          processed_payload: payload
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate time format (accepts both "9:00" and "09:00" format)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(payload.scheduled_time)) {
      console.error("Invalid time format:", payload.scheduled_time);
      return new Response(
        JSON.stringify({ 
          error: "Invalid time format. Expected H:MM or HH:MM (e.g., 9:00 or 09:00)",
          received_time: payload.scheduled_time
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(payload.scheduled_date)) {
      console.error("Invalid date format:", payload.scheduled_date);
      return new Response(
        JSON.stringify({ 
          error: "Invalid date format. Expected YYYY-MM-DD",
          received_date: payload.scheduled_date
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the parsed date/time for debugging timezone issues
    console.log("Timezone handling - Brazil/Sao_Paulo (UTC-3):");
    console.log(`  Input: ${payload.scheduled_date} ${payload.scheduled_time}`);
    console.log(`  Note: Times are stored in database with timezone awareness`);

    // Validate source if provided
    if (payload.source && !['Scouter', 'Meta'].includes(payload.source)) {
      return new Response(
        JSON.stringify({ error: "Invalid source. Must be 'Scouter' or 'Meta'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if appointment already exists (avoid duplicates)
    const { data: existing } = await supabaseClient
      .from("appointments")
      .select("id")
      .eq("bitrix_id", payload.bitrix_id)
      .eq("scheduled_date", payload.scheduled_date)
      .maybeSingle();

    if (existing) {
      console.log("Appointment already exists, updating:", existing.id);
      
      const { data: updated, error: updateError } = await supabaseClient
        .from("appointments")
        .update({
          client_name: payload.client_name,
          phone: payload.phone || null,
          model_name: payload.model_name,
          scheduled_time: payload.scheduled_time,
          telemarketing_name: payload.telemarketing_name || null,
          source: payload.source || null,
          scouter_name: payload.scouter_name || null,
          latitude: payload.latitude || null,
          longitude: payload.longitude || null,
          project_id: payload.project_id || DEFAULT_PROJECT_ID,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating appointment:", updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true, action: "updated", appointment: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new appointment
    const { data: appointment, error } = await supabaseClient
      .from("appointments")
      .insert({
        client_name: payload.client_name,
        phone: payload.phone || null,
        bitrix_id: payload.bitrix_id,
        model_name: payload.model_name,
        scheduled_date: payload.scheduled_date,
        scheduled_time: payload.scheduled_time,
        telemarketing_name: payload.telemarketing_name || null,
        source: payload.source || null,
        scouter_name: payload.scouter_name || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        project_id: payload.project_id || DEFAULT_PROJECT_ID,
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
      JSON.stringify({ success: true, action: "created", appointment }),
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
