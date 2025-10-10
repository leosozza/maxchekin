import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BitrixField {
  name: string;
  title: string;
  type: string;
}

export function useBitrixFields() {
  return useQuery({
    queryKey: ["bitrix-fields"],
    queryFn: async () => {
      // Get webhook URL from database
      const { data: config } = await supabase
        .from("webhook_config")
        .select("bitrix_webhook_url")
        .eq("is_active", true)
        .maybeSingle();

      if (!config?.bitrix_webhook_url) {
        throw new Error("Webhook URL not configured");
      }

      // Fetch fields from Bitrix24
      const response = await fetch(
        `${config.bitrix_webhook_url}/crm.lead.fields.json`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch Bitrix fields");
      }

      const data = await response.json();

      if (!data.result) {
        throw new Error("Invalid Bitrix response");
      }

      // Transform to array of fields
      const fields: BitrixField[] = Object.entries(data.result).map(
        ([name, field]: [string, any]) => ({
          name,
          title: field.formLabel || field.listLabel || name,
          type: field.type || "string",
        })
      );

      return fields;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
}
