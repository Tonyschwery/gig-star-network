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
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          permissions: string[]
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: string[]
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: string[]
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      booking_request_tracking: {
        Row: {
          created_at: string
          id: string
          month_year: string
          request_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_year: string
          request_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_year?: string
          request_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booker_email: string | null
          booker_name: string
          booker_phone: string | null
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
          booker_phone?: string | null
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
          booker_phone?: string | null
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
          {
            foreignKeyName: "bookings_talent_id_fkey"
            columns: ["talent_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          booking_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string | null
          data: Json | null
          error_message: string | null
          event_type: string
          id: string
          recipient_email: string
          recipient_name: string | null
          retry_count: number | null
          sender_email: string
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          event_type: string
          id?: string
          recipient_email: string
          recipient_name?: string | null
          retry_count?: number | null
          sender_email?: string
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          event_type?: string
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          retry_count?: number | null
          sender_email?: string
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
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
      event_requests: {
        Row: {
          admin_reply: string | null
          booker_email: string
          booker_name: string
          booker_phone: string | null
          created_at: string
          description: string | null
          event_date: string
          event_duration: number
          event_location: string
          event_type: string
          id: string
          replied_at: string | null
          status: string
          talent_type_needed: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          booker_email: string
          booker_name: string
          booker_phone?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          event_duration: number
          event_location: string
          event_type: string
          id?: string
          replied_at?: string | null
          status?: string
          talent_type_needed?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          booker_email?: string
          booker_name?: string
          booker_phone?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_duration?: number
          event_location?: string
          event_type?: string
          id?: string
          replied_at?: string | null
          status?: string
          talent_type_needed?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      talent_profiles: {
        Row: {
          act: Database["public"]["Enums"]["talent_act"]
          age: string
          artist_name: string
          biography: string
          created_at: string
          currency: string | null
          current_period_end: string | null
          custom_genre: string | null
          gallery_images: string[] | null
          gender: Database["public"]["Enums"]["talent_gender"]
          id: string
          is_pro_subscriber: boolean
          location: string | null
          music_genres: string[]
          nationality: string
          paypal_subscription_id: string | null
          picture_url: string | null
          plan_id: string | null
          rate_per_hour: number | null
          soundcloud_link: string | null
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
          current_period_end?: string | null
          custom_genre?: string | null
          gallery_images?: string[] | null
          gender: Database["public"]["Enums"]["talent_gender"]
          id?: string
          is_pro_subscriber?: boolean
          location?: string | null
          music_genres?: string[]
          nationality: string
          paypal_subscription_id?: string | null
          picture_url?: string | null
          plan_id?: string | null
          rate_per_hour?: number | null
          soundcloud_link?: string | null
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
          current_period_end?: string | null
          custom_genre?: string | null
          gallery_images?: string[] | null
          gender?: Database["public"]["Enums"]["talent_gender"]
          id?: string
          is_pro_subscriber?: boolean
          location?: string | null
          music_genres?: string[]
          nationality?: string
          paypal_subscription_id?: string | null
          picture_url?: string | null
          plan_id?: string | null
          rate_per_hour?: number | null
          soundcloud_link?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
          youtube_link?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          detected_location: string | null
          id: string
          location_override: boolean | null
          preferred_location: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detected_location?: string | null
          id?: string
          location_override?: boolean | null
          preferred_location?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detected_location?: string | null
          id?: string
          location_override?: boolean | null
          preferred_location?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      talent_profiles_public: {
        Row: {
          act: Database["public"]["Enums"]["talent_act"] | null
          age: string | null
          artist_name: string | null
          biography: string | null
          created_at: string | null
          currency: string | null
          custom_genre: string | null
          gallery_images: string[] | null
          gender: Database["public"]["Enums"]["talent_gender"] | null
          id: string | null
          is_pro_subscriber: boolean | null
          location: string | null
          music_genres: string[] | null
          nationality: string | null
          picture_url: string | null
          rate_per_hour: number | null
          soundcloud_link: string | null
          youtube_link: string | null
        }
        Insert: {
          act?: Database["public"]["Enums"]["talent_act"] | null
          age?: string | null
          artist_name?: string | null
          biography?: string | null
          created_at?: string | null
          currency?: string | null
          custom_genre?: string | null
          gallery_images?: string[] | null
          gender?: Database["public"]["Enums"]["talent_gender"] | null
          id?: string | null
          is_pro_subscriber?: boolean | null
          location?: string | null
          music_genres?: string[] | null
          nationality?: string | null
          picture_url?: string | null
          rate_per_hour?: number | null
          soundcloud_link?: string | null
          youtube_link?: string | null
        }
        Update: {
          act?: Database["public"]["Enums"]["talent_act"] | null
          age?: string | null
          artist_name?: string | null
          biography?: string | null
          created_at?: string | null
          currency?: string | null
          custom_genre?: string | null
          gallery_images?: string[] | null
          gender?: Database["public"]["Enums"]["talent_gender"] | null
          id?: string | null
          is_pro_subscriber?: boolean | null
          location?: string | null
          music_genres?: string[] | null
          nationality?: string | null
          picture_url?: string | null
          rate_per_hour?: number | null
          soundcloud_link?: string | null
          youtube_link?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_user: {
        Args: { user_id_to_delete: string }
        Returns: Json
      }
      admin_update_subscription: {
        Args: { is_pro: boolean; talent_id_param: string }
        Returns: Json
      }
      check_booking_limit: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      check_talent_booking_limit: {
        Args: { talent_id_param: string }
        Returns: boolean
      }
      cleanup_expired_chat_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      complete_manual_payment: {
        Args: { payment_id_param: string }
        Returns: Json
      }
      create_admin_support_booking: {
        Args: { user_id_param: string }
        Returns: string
      }
      get_admin_permissions: {
        Args: { user_id_param?: string }
        Returns: string[]
      }
      get_payment_status: {
        Args: { booking_id_param: string }
        Returns: Json
      }
      get_talent_accepted_bookings_count: {
        Args: { talent_id_param: string }
        Returns: number
      }
      get_user_location_preference: {
        Args: { user_id_param?: string }
        Returns: string
      }
      get_user_talent_profile: {
        Args: { user_id_param?: string }
        Returns: {
          act: string
          artist_name: string
          currency: string
          id: string
          is_pro_subscriber: boolean
          rate_per_hour: number
          subscription_status: string
        }[]
      }
      increment_booking_count: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      is_admin: {
        Args: { user_id_param?: string }
        Returns: boolean
      }
      user_has_talent_profile: {
        Args: { user_id_param?: string }
        Returns: boolean
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
