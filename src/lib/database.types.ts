export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      places: {
        Row: {
          area: Database["public"]["Enums"]["place_area"]
          category: Database["public"]["Enums"]["place_category"]
          claimed_by: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          instagram_handle: string | null
          is_verified: boolean
          last_confirmed_at: string | null
          name: string
          price_range: Database["public"]["Enums"]["price_range"]
          schedule: string | null
          status: Database["public"]["Enums"]["place_status"]
          submitted_by: string | null
          tags: Database["public"]["Enums"]["place_tag"][]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          area: Database["public"]["Enums"]["place_area"]
          category: Database["public"]["Enums"]["place_category"]
          claimed_by?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_handle?: string | null
          is_verified?: boolean
          last_confirmed_at?: string | null
          name: string
          price_range: Database["public"]["Enums"]["price_range"]
          schedule?: string | null
          status?: Database["public"]["Enums"]["place_status"]
          submitted_by?: string | null
          tags?: Database["public"]["Enums"]["place_tag"][]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          area?: Database["public"]["Enums"]["place_area"]
          category?: Database["public"]["Enums"]["place_category"]
          claimed_by?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_handle?: string | null
          is_verified?: boolean
          last_confirmed_at?: string | null
          name?: string
          price_range?: Database["public"]["Enums"]["price_range"]
          schedule?: string | null
          status?: Database["public"]["Enums"]["place_status"]
          submitted_by?: string | null
          tags?: Database["public"]["Enums"]["place_tag"][]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_place_status: {
        Args: {
          p_place_id: string
          p_status: Database["public"]["Enums"]["place_status"]
        }
        Returns: undefined
      }
      admin_set_place_verified: {
        Args: { p_place_id: string; p_verified: boolean }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      place_area:
        | "downtown"
        | "southside"
        | "lakeview"
        | "avondale"
        | "crestwood"
        | "homewood"
        | "mountain_brook"
        | "vestavia_hills"
        | "hoover"
        | "trussville"
      place_category: "studio" | "trainer" | "run_club" | "gym"
      place_status: "pending" | "approved" | "rejected" | "hidden"
      place_tag:
        | "beginner_friendly"
        | "all_levels"
        | "strength"
        | "cardio"
        | "yoga"
        | "running"
        | "drop_in"
        | "free_trial"
        | "outdoor"
      price_range: "free" | "budget" | "moderate" | "premium"
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
      place_area: [
        "downtown",
        "southside",
        "lakeview",
        "avondale",
        "crestwood",
        "homewood",
        "mountain_brook",
        "vestavia_hills",
        "hoover",
        "trussville",
      ],
      place_category: ["studio", "trainer", "run_club", "gym"],
      place_status: ["pending", "approved", "rejected", "hidden"],
      place_tag: [
        "beginner_friendly",
        "all_levels",
        "strength",
        "cardio",
        "yoga",
        "running",
        "drop_in",
        "free_trial",
        "outdoor",
      ],
      price_range: ["free", "budget", "moderate", "premium"],
    },
  },
} as const

