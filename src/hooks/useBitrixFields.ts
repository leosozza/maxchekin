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
      // Get webhook URL from database - always fresh
      const { data: config } = await supabase
        .from("webhook_config")
        .select("bitrix_webhook_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
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
    staleTime: 0, // Nunca usar cache - sempre buscar dados atualizados
    gcTime: 0, // Não manter em cache (novo nome em React Query v5)
    retry: 2,
  });
}
