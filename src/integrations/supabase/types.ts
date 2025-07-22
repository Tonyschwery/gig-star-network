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
      booking_messages: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_type: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_type: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booker_email: string | null
          booker_name: string
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
          talent_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booker_email?: string | null
          booker_name?: string
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
          talent_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booker_email?: string | null
          booker_name?: string
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
          talent_id?: string
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
          subscription_started_at: string | null
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
          subscription_started_at?: string | null
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
          subscription_started_at?: string | null
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
      [_ in never]: never
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
