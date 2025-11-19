export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      apk_config: {
        Row: {
          created_at: string | null
          download_url: string
          file_size: number | null
          id: string
          is_active: boolean | null
          release_notes: string | null
          updated_at: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          download_url: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          release_notes?: string | null
          updated_at?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          download_url?: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          release_notes?: string | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      check_in_config: {
        Row: {
          created_at: string | null
          display_duration_seconds: number | null
          id: string
          show_lead_id: boolean | null
          show_photo_placeholder: boolean | null
          show_responsible: boolean | null
          updated_at: string | null
          welcome_message: string
        }
        Insert: {
          created_at?: string | null
          display_duration_seconds?: number | null
          id?: string
          show_lead_id?: boolean | null
          show_photo_placeholder?: boolean | null
          show_responsible?: boolean | null
          updated_at?: string | null
          welcome_message?: string
        }
        Update: {
          created_at?: string | null
          display_duration_seconds?: number | null
          id?: string
          show_lead_id?: boolean | null
          show_photo_placeholder?: boolean | null
          show_responsible?: boolean | null
          updated_at?: string | null
          welcome_message?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          bitrix_updated: boolean | null
          checked_in_at: string | null
          id: string
          lead_id: string
          model_name: string
          model_photo: string | null
          responsible: string | null
        }
        Insert: {
          bitrix_updated?: boolean | null
          checked_in_at?: string | null
          id?: string
          lead_id: string
          model_name: string
          model_photo?: string | null
          responsible?: string | null
        }
        Update: {
          bitrix_updated?: boolean | null
          checked_in_at?: string | null
          id?: string
          lead_id?: string
          model_name?: string
          model_photo?: string | null
          responsible?: string | null
        }
        Relationships: []
      }
      custom_fields: {
        Row: {
          bitrix_field_name: string | null
          created_at: string | null
          field_key: string
          field_label: string
          field_options: Json | null
          field_type: string
          id: string
          is_active: boolean | null
          show_in_checkin: boolean | null
          show_in_panels: boolean | null
          sort_order: number | null
        }
        Insert: {
          bitrix_field_name?: string | null
          created_at?: string | null
          field_key: string
          field_label: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_active?: boolean | null
          show_in_checkin?: boolean | null
          show_in_panels?: boolean | null
          sort_order?: number | null
        }
        Update: {
          bitrix_field_name?: string | null
          created_at?: string | null
          field_key?: string
          field_label?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          show_in_checkin?: boolean | null
          show_in_panels?: boolean | null
          sort_order?: number | null
        }
        Relationships: []
      }
      field_mapping: {
        Row: {
          bitrix_field_name: string
          created_at: string | null
          field_type: string
          id: string
          is_active: boolean | null
          maxcheckin_field_name: string
          transform_function: string | null
        }
        Insert: {
          bitrix_field_name: string
          created_at?: string | null
          field_type: string
          id?: string
          is_active?: boolean | null
          maxcheckin_field_name: string
          transform_function?: string | null
        }
        Update: {
          bitrix_field_name?: string
          created_at?: string | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          maxcheckin_field_name?: string
          transform_function?: string | null
        }
        Relationships: []
      }
      theme_preferences: {
        Row: {
          created_at: string
          id: string
          theme_mode: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          theme_mode: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          theme_mode?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          id: string
          resource_id: string | null
          resource_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          resource_id?: string | null
          resource_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          resource_id?: string | null
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_config: {
        Row: {
          auth_token: string | null
          bitrix_webhook_url: string
          created_at: string | null
          id: string
          is_active: boolean | null
          notify_on_call: boolean | null
          notify_on_checkin: boolean | null
          panel_id: string | null
          updated_at: string | null
        }
        Insert: {
          auth_token?: string | null
          bitrix_webhook_url: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notify_on_call?: boolean | null
          notify_on_checkin?: boolean | null
          panel_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_token?: string | null
          bitrix_webhook_url?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notify_on_call?: boolean | null
          notify_on_checkin?: boolean | null
          panel_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operator", "viewer"],
    },
  },
} as const
