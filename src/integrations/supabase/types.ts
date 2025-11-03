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
      activity_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
          message: string
          metadata: Json | null
          panel_id: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          message: string
          metadata?: Json | null
          panel_id?: string | null
          severity: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          message?: string
          metadata?: Json | null
          panel_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          called_at: string | null
          completed_at: string | null
          created_at: string | null
          custom_data: Json | null
          id: string
          lead_id: string
          model_name: string
          model_photo: string | null
          panel_id: string | null
          responsible: string | null
          room: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          called_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          custom_data?: Json | null
          id?: string
          lead_id: string
          model_name: string
          model_photo?: string | null
          panel_id?: string | null
          responsible?: string | null
          room?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          called_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          custom_data?: Json | null
          id?: string
          lead_id?: string
          model_name?: string
          model_photo?: string | null
          panel_id?: string | null
          responsible?: string | null
          room?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
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
      kanban_cards: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string
          model_name: string | null
          position: number
          responsible: string | null
          room: string | null
          stage_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id: string
          model_name?: string | null
          position?: number
          responsible?: string | null
          room?: string | null
          stage_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string
          model_name?: string | null
          position?: number
          responsible?: string | null
          room?: string | null
          stage_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_cards_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "kanban_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_events: {
        Row: {
          by_user: string | null
          created_at: string | null
          from_stage_id: string | null
          id: string
          lead_id: string
          method: string | null
          to_stage_id: string | null
        }
        Insert: {
          by_user?: string | null
          created_at?: string | null
          from_stage_id?: string | null
          id?: string
          lead_id: string
          method?: string | null
          to_stage_id?: string | null
        }
        Update: {
          by_user?: string | null
          created_at?: string | null
          from_stage_id?: string | null
          id?: string
          lead_id?: string
          method?: string | null
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_events_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "kanban_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_events_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "kanban_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_stage_users: {
        Row: {
          stage_id: string
          user_id: string
        }
        Insert: {
          stage_id: string
          user_id: string
        }
        Update: {
          stage_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_stage_users_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "kanban_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_stages: {
        Row: {
          auto_call: boolean | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          panel_id: string | null
          position: number
          updated_at: string | null
          webhook_on_enter: boolean | null
          webhook_on_exit: boolean | null
          webhook_url: string | null
        }
        Insert: {
          auto_call?: boolean | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          panel_id?: string | null
          position?: number
          updated_at?: string | null
          webhook_on_enter?: boolean | null
          webhook_on_exit?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          auto_call?: boolean | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          panel_id?: string | null
          position?: number
          updated_at?: string | null
          webhook_on_enter?: boolean | null
          webhook_on_exit?: boolean | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_stages_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string | null
          display_mode: string
          id: string
          is_active: boolean | null
          panel_id: string | null
          sort_order: number | null
          title: string | null
          type: string
          url: string
        }
        Insert: {
          created_at?: string | null
          display_mode?: string
          id?: string
          is_active?: boolean | null
          panel_id?: string | null
          sort_order?: number | null
          title?: string | null
          type: string
          url: string
        }
        Update: {
          created_at?: string | null
          display_mode?: string
          id?: string
          is_active?: boolean | null
          panel_id?: string | null
          sort_order?: number | null
          title?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_config: {
        Row: {
          auto_advance: boolean | null
          auto_advance_seconds: number | null
          bitrix_webhook_url: string | null
          created_at: string | null
          id: string
          notify_on_call: boolean | null
          panel_id: string | null
          updated_at: string | null
          visible_fields: Json | null
        }
        Insert: {
          auto_advance?: boolean | null
          auto_advance_seconds?: number | null
          bitrix_webhook_url?: string | null
          created_at?: string | null
          id?: string
          notify_on_call?: boolean | null
          panel_id?: string | null
          updated_at?: string | null
          visible_fields?: Json | null
        }
        Update: {
          auto_advance?: boolean | null
          auto_advance_seconds?: number | null
          bitrix_webhook_url?: string | null
          created_at?: string | null
          id?: string
          notify_on_call?: boolean | null
          panel_id?: string | null
          updated_at?: string | null
          visible_fields?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "panel_config_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: true
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_layouts: {
        Row: {
          canvas_height: number
          canvas_width: number
          created_at: string | null
          elements: Json
          id: string
          orientation: string
          panel_id: string
          updated_at: string | null
        }
        Insert: {
          canvas_height?: number
          canvas_width?: number
          created_at?: string | null
          elements?: Json
          id?: string
          orientation?: string
          panel_id: string
          updated_at?: string | null
        }
        Update: {
          canvas_height?: number
          canvas_width?: number
          created_at?: string | null
          elements?: Json
          id?: string
          orientation?: string
          panel_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "panel_layouts_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: true
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
      }
      panels: {
        Row: {
          bitrix_stage_id: string | null
          created_at: string | null
          default_layout: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          bitrix_stage_id?: string | null
          created_at?: string | null
          default_layout?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          bitrix_stage_id?: string | null
          created_at?: string | null
          default_layout?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      screensaver_config: {
        Row: {
          created_at: string | null
          enable_particles: boolean
          id: string
          performance_mode: string
          screensaver_mode: string
          show_branding: boolean
          show_qr_code: boolean
          slide_duration_seconds: number
          tap_message: string
          transition_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enable_particles?: boolean
          id?: string
          performance_mode?: string
          screensaver_mode?: string
          show_branding?: boolean
          show_qr_code?: boolean
          slide_duration_seconds?: number
          tap_message?: string
          transition_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enable_particles?: boolean
          id?: string
          performance_mode?: string
          screensaver_mode?: string
          show_branding?: boolean
          show_qr_code?: boolean
          slide_duration_seconds?: number
          tap_message?: string
          transition_type?: string
          updated_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "webhook_config_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
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
