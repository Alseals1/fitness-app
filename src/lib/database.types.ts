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
      place_rejections: {
        Row: {
          created_at: string
          id: string
          place_id: string
          reason: string
          rejected_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          place_id: string
          reason: string
          rejected_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          place_id?: string
          reason?: string
          rejected_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_rejections_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      place_submissions: {
        Row: {
          certification_name: string | null
          claim_rejection_reason: string | null
          claim_status: Database["public"]["Enums"]["claim_status"] | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["submission_kind"]
          note: string | null
          place_id: string
          reviewed_at: string | null
          submitted_by: string
          verification_email: string | null
          verification_social: string | null
        }
        Insert: {
          certification_name?: string | null
          claim_rejection_reason?: string | null
          claim_status?: Database["public"]["Enums"]["claim_status"] | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["submission_kind"]
          note?: string | null
          place_id: string
          reviewed_at?: string | null
          submitted_by?: string
          verification_email?: string | null
          verification_social?: string | null
        }
        Update: {
          certification_name?: string | null
          claim_rejection_reason?: string | null
          claim_status?: Database["public"]["Enums"]["claim_status"] | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["submission_kind"]
          note?: string | null
          place_id?: string
          reviewed_at?: string | null
          submitted_by?: string
          verification_email?: string | null
          verification_social?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_submissions_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          area: Database["public"]["Enums"]["place_area"]
          category: Database["public"]["Enums"]["place_category"]
          certification_name: string | null
          claimed_by: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          instagram_handle: string | null
          is_certified: boolean
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
          certification_name?: string | null
          claimed_by?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_handle?: string | null
          is_certified?: boolean
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
          certification_name?: string | null
          claimed_by?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_handle?: string | null
          is_certified?: boolean
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
      admin_approve_claim: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      admin_create_place: {
        Args: {
          p_area: Database["public"]["Enums"]["place_area"]
          p_category: Database["public"]["Enums"]["place_category"]
          p_contact_email?: string
          p_contact_phone?: string
          p_description?: string
          p_instagram_handle?: string
          p_is_verified?: boolean
          p_name: string
          p_price_range: Database["public"]["Enums"]["price_range"]
          p_schedule?: string
          p_status?: Database["public"]["Enums"]["place_status"]
          p_tags?: Database["public"]["Enums"]["place_tag"][]
          p_website_url?: string
        }
        Returns: string
      }
      admin_list_submissions: {
        Args: never
        Returns: {
          account_email: string
          certification_name: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["submission_kind"]
          note: string
          place_category: Database["public"]["Enums"]["place_category"]
          place_id: string
          place_is_claimed: boolean
          place_name: string
          place_status: Database["public"]["Enums"]["place_status"]
          verification_email: string
          verification_social: string
        }[]
      }
      admin_reject_claim: {
        Args: { p_reason: string; p_submission_id: string }
        Returns: undefined
      }
      admin_reject_place: {
        Args: { p_place_id: string; p_reason: string }
        Returns: undefined
      }
      admin_set_place_certified: {
        Args: { p_certification_name: string; p_place_id: string }
        Returns: undefined
      }
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
      enforce_submission_limit: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      submit_new_place: {
        Args: {
          p_area: Database["public"]["Enums"]["place_area"]
          p_category: Database["public"]["Enums"]["place_category"]
          p_certification_name?: string
          p_contact_email?: string
          p_contact_phone?: string
          p_description?: string
          p_instagram_handle?: string
          p_name: string
          p_note?: string
          p_price_range: Database["public"]["Enums"]["price_range"]
          p_schedule?: string
          p_tags?: Database["public"]["Enums"]["place_tag"][]
          p_verification_email?: string
          p_verification_social?: string
          p_website_url?: string
        }
        Returns: string
      }
      submit_place_claim: {
        Args: {
          p_certification_name?: string
          p_note?: string
          p_place_id: string
          p_verification_email?: string
          p_verification_social?: string
        }
        Returns: string
      }
    }
    Enums: {
      claim_status: "pending" | "approved" | "rejected"
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
        | "mornings"
        | "evenings"
        | "weekends"
      price_range: "free" | "budget" | "moderate" | "premium"
      submission_kind: "new_place" | "claim"
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
      claim_status: ["pending", "approved", "rejected"],
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
        "mornings",
        "evenings",
        "weekends",
      ],
      price_range: ["free", "budget", "moderate", "premium"],
      submission_kind: ["new_place", "claim"],
    },
  },
} as const

