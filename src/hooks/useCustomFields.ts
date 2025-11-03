import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomField {
  id: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'image' | 'boolean' | 'list';
  bitrix_field_name: string | null;
  is_active: boolean;
  show_in_checkin: boolean;
  show_in_panels: boolean;
  sort_order: number;
  field_options?: string[];
}

export function useCustomFields(filter?: { show_in_checkin?: boolean; show_in_panels?: boolean }) {
  return useQuery({
    queryKey: ["custom-fields", filter],
    queryFn: async () => {
      let query = supabase
        .from("custom_fields")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (filter?.show_in_checkin !== undefined) {
        query = query.eq("show_in_checkin", filter.show_in_checkin);
      }

      if (filter?.show_in_panels !== undefined) {
        query = query.eq("show_in_panels", filter.show_in_panels);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CustomField[];
    },
  });
}
