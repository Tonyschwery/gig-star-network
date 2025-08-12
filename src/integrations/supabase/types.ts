export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booker_email: string | null
          booker_name: string
          budget: number | null
          budget_currency: string | null
          created_at: string
          custom_equipment: string | null
          description: string | null
          equipment_types: string[] | null
          event_address: string
          event_date: string
          event_duration: number
          event_location: string
          event_type: string
          id: string
          is_gig_opportunity: boolean | null
          is_public_request: boolean | null
          needs_equipment: boolean | null
          status: string
          talent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booker_email?: string | null
          booker_name?: string
          budget?: number | null
          budget_currency?: string | null
          created_at?: string
          custom_equipment?: string | null
          description?: string | null
          equipment_types?: string[] | null
          event_address: string
          event_date: string
          event_duration: number
          event_location: string
          event_type: string
          id?: string
          is_gig_opportunity?: boolean | null
          is_public_request?: boolean | null
          needs_equipment?: boolean | null
          status?: string
          talent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booker_email?: string | null
          booker_name?: string
          budget?: number | null
          budget_currency?: string | null
          created_at?: string
          custom_equipment?: string | null
          description?: string | null
          equipment_types?: string[] | null
          event_address?: string
          event_date?: string
          event_duration?: number
          event_location?: string
          event_type?: string
          id?: string
          is_gig_opportunity?: boolean | null
          is_public_request?: boolean | null
          needs_equipment?: boolean | null
          status?: string
          talent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_talent_id_fkey"
            columns: ["talent_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string
          created_at: string
          gig_application_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          gig_application_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          gig_application_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_gig_application_id_fkey"
            columns: ["gig_application_id"]
            isOneToOne: false
            referencedRelation: "gig_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          booking_notifications: boolean
          created_at: string
          id: string
          marketing_emails: boolean
          message_notifications: boolean
          payment_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_notifications?: boolean
          created_at?: string
          id?: string
          marketing_emails?: boolean
          message_notifications?: boolean
          payment_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_notifications?: boolean
          created_at?: string
          id?: string
          marketing_emails?: boolean
          message_notifications?: boolean
          payment_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gig_applications: {
        Row: {
          created_at: string
          gig_id: string
          id: string
          status: string
          talent_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gig_id: string
          id?: string
          status?: string
          talent_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gig_id?: string
          id?: string
          status?: string
          talent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_applications_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_applications_talent_id_fkey"
            columns: ["talent_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: number
          is_read: boolean | null
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: never
          is_read?: boolean | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: never
          is_read?: boolean | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          message_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          message_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          message_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          booker_id: string
          booking_id: string
          commission_rate: number
          created_at: string
          currency: string
          hourly_rate: number
          hours_booked: number
          id: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          platform_commission: number
          processed_at: string | null
          talent_earnings: number
          talent_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          booker_id: string
          booking_id: string
          commission_rate?: number
          created_at?: string
          currency?: string
          hourly_rate: number
          hours_booked: number
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          platform_commission?: number
          processed_at?: string | null
          talent_earnings: number
          talent_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          booker_id?: string
          booking_id?: string
          commission_rate?: number
          created_at?: string
          currency?: string
          hourly_rate?: number
          hours_booked?: number
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          platform_commission?: number
          processed_at?: string | null
          talent_earnings?: number
          talent_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_talent_id_fkey"
            columns: ["talent_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_profiles: {
        Row: {
          act: Database["public"]["Enums"]["talent_act"]
          age: string
          artist_name: string
          biography: string
          created_at: string
          currency: string | null
          custom_genre: string | null
          gallery_images: string[] | null
          gender: Database["public"]["Enums"]["talent_gender"]
          id: string
          is_pro_subscriber: boolean
          location: string | null
          music_genres: string[]
          nationality: string
          picture_url: string | null
          rate_per_hour: number | null
          soundcloud_link: string | null
          stripe_customer_id: string | null
          subscription_started_at: string | null
          subscription_status: string
          updated_at: string
          user_id: string
          youtube_link: string | null
        }
        Insert: {
          act: Database["public"]["Enums"]["talent_act"]
          age: string
          artist_name: string
          biography: string
          created_at?: string
          currency?: string | null
          custom_genre?: string | null
          gallery_images?: string[] | null
          gender: Database["public"]["Enums"]["talent_gender"]
          id?: string
          is_pro_subscriber?: boolean
          location?: string | null
          music_genres?: string[]
          nationality: string
          picture_url?: string | null
          rate_per_hour?: number | null
          soundcloud_link?: string | null
          stripe_customer_id?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id: string
          youtube_link?: string | null
        }
        Update: {
          act?: Database["public"]["Enums"]["talent_act"]
          age?: string
          artist_name?: string
          biography?: string
          created_at?: string
          currency?: string | null
          custom_genre?: string | null
          gallery_images?: string[] | null
          gender?: Database["public"]["Enums"]["talent_gender"]
          id?: string
          is_pro_subscriber?: boolean
          location?: string | null
          music_genres?: string[]
          nationality?: string
          picture_url?: string | null
          rate_per_hour?: number | null
          soundcloud_link?: string | null
          stripe_customer_id?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
          youtube_link?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_manual_payment: {
        Args: { payment_id_param: string }
        Returns: Json
      }
      filter_message_content: {
        Args: { content: string }
        Returns: string
      }
      get_payment_status: {
        Args: { booking_id_param: string }
        Returns: Json
      }
      get_unread_message_count: {
        Args: { user_id_param: string }
        Returns: number
      }
      mark_conversation_messages_read: {
        Args: { conversation_id_param: string; user_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
      talent_act:
        | "dj"
        | "band"
        | "saxophonist"
        | "percussionist"
        | "singer"
        | "keyboardist"
        | "drummer"
      talent_gender: "male" | "female"
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
      talent_act: [
        "dj",
        "band",
        "saxophonist",
        "percussionist",
        "singer",
        "keyboardist",
        "drummer",
      ],
      talent_gender: ["male", "female"],
    },
  },
} as const
