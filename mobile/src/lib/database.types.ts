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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_devices: {
        Row: {
          auth_user_id: string
          created_at: string
          enabled: boolean
          hotel_id: string
          label: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          enabled?: boolean
          hotel_id: string
          label: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          enabled?: boolean
          hotel_id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_devices_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      cashier_display: {
        Row: {
          employee_name: string | null
          hotel_id: string
          schedule_label: string | null
          status: string
          updated_at: string
        }
        Insert: {
          employee_name?: string | null
          hotel_id: string
          schedule_label?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          employee_name?: string | null
          hotel_id?: string
          schedule_label?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashier_display_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: true
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      cashier_shifts: {
        Row: {
          employee_id: string
          ended_at: string | null
          ended_from_device: string | null
          hotel_id: string
          id: string
          started_at: string
          started_from_device: string | null
        }
        Insert: {
          employee_id: string
          ended_at?: string | null
          ended_from_device?: string | null
          hotel_id: string
          id?: string
          started_at?: string
          started_from_device?: string | null
        }
        Update: {
          employee_id?: string
          ended_at?: string | null
          ended_from_device?: string | null
          hotel_id?: string
          id?: string
          started_at?: string
          started_from_device?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashier_shift_employee_fk"
            columns: ["employee_id", "hotel_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "hotel_id"]
          },
          {
            foreignKeyName: "cashier_shifts_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          full_name: string
          hotel_id: string
          id: string
          is_active: boolean
          schedule_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          hotel_id: string
          id?: string
          is_active?: boolean
          schedule_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          hotel_id?: string
          id?: string
          is_active?: boolean
          schedule_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_path: string
          hotel_id: string
          id: string
          kind: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_path: string
          hotel_id: string
          id?: string
          kind: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_path?: string
          hotel_id?: string
          id?: string
          kind?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          body: string
          created_at: string
          display_order: number
          hotel_id: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          display_order?: number
          hotel_id: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          display_order?: number
          hotel_id?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      service_hours: {
        Row: {
          closes_at: string
          created_at: string
          hotel_id: string
          id: string
          note: string | null
          opens_at: string
          service_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          closes_at: string
          created_at?: string
          hotel_id: string
          id?: string
          note?: string | null
          opens_at: string
          service_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          closes_at?: string
          created_at?: string
          hotel_id?: string
          id?: string
          note?: string | null
          opens_at?: string
          service_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_hours_service_fk"
            columns: ["service_id", "hotel_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id", "hotel_id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          details: string | null
          display_order: number
          hotel_id: string
          icon_storage_path: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          details?: string | null
          display_order?: number
          hotel_id: string
          icon_storage_path?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          details?: string | null
          display_order?: number
          hotel_id?: string
          icon_storage_path?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_devices: {
        Row: {
          auth_user_id: string
          hotel_id: string
          id: string
          location: string | null
          name: string
          paired_at: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          hotel_id: string
          id?: string
          location?: string | null
          name: string
          paired_at?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          hotel_id?: string
          id?: string
          location?: string | null
          name?: string
          paired_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_devices_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_screen_state: {
        Row: {
          hotel_id: string
          media_id: string | null
          section: string | null
          tv_id: string
          updated_at: string
          welcome_id: string | null
        }
        Insert: {
          hotel_id: string
          media_id?: string | null
          section?: string | null
          tv_id: string
          updated_at?: string
          welcome_id?: string | null
        }
        Update: {
          hotel_id?: string
          media_id?: string | null
          section?: string | null
          tv_id?: string
          updated_at?: string
          welcome_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_screen_device_fk"
            columns: ["tv_id", "hotel_id"]
            isOneToOne: false
            referencedRelation: "tv_devices"
            referencedColumns: ["id", "hotel_id"]
          },
          {
            foreignKeyName: "tv_screen_media_fk"
            columns: ["media_id", "hotel_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id", "hotel_id"]
          },
          {
            foreignKeyName: "tv_screen_welcome_fk"
            columns: ["welcome_id", "hotel_id"]
            isOneToOne: false
            referencedRelation: "welcome_messages"
            referencedColumns: ["id", "hotel_id"]
          },
        ]
      }
      welcome_messages: {
        Row: {
          body: string
          created_at: string
          hotel_id: string
          id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          hotel_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          hotel_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "welcome_messages_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
