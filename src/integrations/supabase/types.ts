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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          admin_user_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          related_id: string | null
          related_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          related_id?: string | null
          related_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          related_id?: string | null
          related_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
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
      booker_profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          description: string | null
          event_address: string
          event_date: string
          event_duration: number
          event_location: string
          event_type: string
          id: string
          is_gig_opportunity: boolean | null
          is_public_request: boolean | null
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
          description?: string | null
          event_address: string
          event_date: string
          event_duration: number
          event_location: string
          event_type: string
          id?: string
          is_gig_opportunity?: boolean | null
          is_public_request?: boolean | null
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
          description?: string | null
          event_address?: string
          event_date?: string
          event_duration?: number
          event_location?: string
          event_type?: string
          id?: string
          is_gig_opportunity?: boolean | null
          is_public_request?: boolean | null
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
            referencedRelation: "talent_profiles_marketing"
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
          booking_id: string | null
          chat_type: string | null
          content: string
          created_at: string
          event_request_id: string | null
          id: string
          is_admin_chat: boolean | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          chat_type?: string | null
          content: string
          created_at?: string
          event_request_id?: string | null
          id?: string
          is_admin_chat?: boolean | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          chat_type?: string | null
          content?: string
          created_at?: string
          event_request_id?: string | null
          id?: string
          is_admin_chat?: boolean | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_event_request_id_fkey"
            columns: ["event_request_id"]
            isOneToOne: false
            referencedRelation: "event_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_risk_tracking: {
        Row: {
          channel_id: string
          channel_type: string
          created_at: string
          detected_patterns: string[] | null
          id: string
          last_updated: string
          risk_score: number
          sender_id: string
        }
        Insert: {
          channel_id: string
          channel_type: string
          created_at?: string
          detected_patterns?: string[] | null
          id?: string
          last_updated?: string
          risk_score?: number
          sender_id: string
        }
        Update: {
          channel_id?: string
          channel_type?: string
          created_at?: string
          detected_patterns?: string[] | null
          id?: string
          last_updated?: string
          risk_score?: number
          sender_id?: string
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
          hidden_by_talents: string[] | null
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
          hidden_by_talents?: string[] | null
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
          hidden_by_talents?: string[] | null
          id?: string
          replied_at?: string | null
          status?: string
          talent_type_needed?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          body: string
          booking_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          notification_type: string | null
          read_at: string | null
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          body: string
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type?: string | null
          read_at?: string | null
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type?: string | null
          read_at?: string | null
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          booking_id: string | null
          created_at: string
          event_request_id: string | null
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
          event_request_id?: string | null
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
          event_request_id?: string | null
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
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_event_request_id_fkey"
            columns: ["event_request_id"]
            isOneToOne: false
            referencedRelation: "event_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          onboarding_complete: boolean | null
          onboarding_draft: Json | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_complete?: boolean | null
          onboarding_draft?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean | null
          onboarding_draft?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          granted_by_admin_id: string | null
          id: string
          is_pro_subscriber: boolean
          location: string | null
          manual_grant_expires_at: string | null
          music_genres: string[]
          nationality: string
          paypal_subscription_id: string | null
          picture_url: string | null
          plan_id: string | null
          provider: string | null
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
          granted_by_admin_id?: string | null
          id?: string
          is_pro_subscriber?: boolean
          location?: string | null
          manual_grant_expires_at?: string | null
          music_genres?: string[]
          nationality: string
          paypal_subscription_id?: string | null
          picture_url?: string | null
          plan_id?: string | null
          provider?: string | null
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
          granted_by_admin_id?: string | null
          id?: string
          is_pro_subscriber?: boolean
          location?: string | null
          manual_grant_expires_at?: string | null
          music_genres?: string[]
          nationality?: string
          paypal_subscription_id?: string | null
          picture_url?: string | null
          plan_id?: string | null
          provider?: string | null
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
      bookings_secure: {
        Row: {
          booker_email: string | null
          booker_name: string | null
          booker_phone: string | null
          budget: number | null
          budget_currency: string | null
          created_at: string | null
          description: string | null
          event_address: string | null
          event_date: string | null
          event_duration: number | null
          event_location: string | null
          event_type: string | null
          id: string | null
          is_gig_opportunity: boolean | null
          is_public_request: boolean | null
          status: string | null
          talent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          booker_email?: never
          booker_name?: string | null
          booker_phone?: never
          budget?: number | null
          budget_currency?: string | null
          created_at?: string | null
          description?: string | null
          event_address?: string | null
          event_date?: string | null
          event_duration?: number | null
          event_location?: string | null
          event_type?: string | null
          id?: string | null
          is_gig_opportunity?: boolean | null
          is_public_request?: boolean | null
          status?: string | null
          talent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          booker_email?: never
          booker_name?: string | null
          booker_phone?: never
          budget?: number | null
          budget_currency?: string | null
          created_at?: string | null
          description?: string | null
          event_address?: string | null
          event_date?: string | null
          event_duration?: number | null
          event_location?: string | null
          event_type?: string | null
          id?: string | null
          is_gig_opportunity?: boolean | null
          is_public_request?: boolean | null
          status?: string | null
          talent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
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
            referencedRelation: "talent_profiles_marketing"
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
      talent_profiles_marketing: {
        Row: {
          act: Database["public"]["Enums"]["talent_act"] | null
          artist_name: string | null
          country: string | null
          created_at: string | null
          custom_genre: string | null
          id: string | null
          is_pro_subscriber: boolean | null
          music_genres: string[] | null
        }
        Insert: {
          act?: Database["public"]["Enums"]["talent_act"] | null
          artist_name?: string | null
          country?: never
          created_at?: string | null
          custom_genre?: string | null
          id?: string | null
          is_pro_subscriber?: boolean | null
          music_genres?: string[] | null
        }
        Update: {
          act?: Database["public"]["Enums"]["talent_act"] | null
          artist_name?: string | null
          country?: never
          created_at?: string | null
          custom_genre?: string | null
          id?: string | null
          is_pro_subscriber?: boolean | null
          music_genres?: string[] | null
        }
        Relationships: []
      }
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
      admin_get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          has_talent_profile: boolean
          id: string
          last_sign_in_at: string
          total_bookings: number
          user_metadata: Json
          user_type: string
        }[]
      }
      admin_revoke_manual_subscription: {
        Args: { talent_id_param: string }
        Returns: Json
      }
      admin_send_direct_message: {
        Args: { message_content: string; target_user_id: string }
        Returns: string
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
      check_talent_profile_exists: {
        Args: { user_id_to_check: string }
        Returns: boolean
      }
      cleanup_expired_bookings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      ensure_profile: {
        Args: { p_email: string; p_role: string; p_user_id: string }
        Returns: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          onboarding_complete: boolean | null
          onboarding_draft: Json | null
          role: string | null
          updated_at: string | null
        }
      }
      get_admin_permissions: {
        Args: { user_id_param?: string }
        Returns: string[]
      }
      get_admin_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_or_create_admin_support_booking: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_payment_status: {
        Args: { booking_id_param: string }
        Returns: Json
      }
      get_talent_accepted_bookings_count: {
        Args: { talent_id_param: string }
        Returns: number
      }
      get_talent_received_bookings_count: {
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
      is_pro_talent: {
        Args: { requesting_user_id: string }
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
