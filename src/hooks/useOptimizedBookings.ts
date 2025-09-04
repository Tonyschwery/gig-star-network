import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BookingWithTalent {
  id: string;
  user_id: string;
  talent_id: string | null;
  event_type: string;
  booker_name: string;
  booker_email?: string;
  event_date?: string;
  status?: string;
  talent_is_pro?: boolean;
}

export const useOptimizedBookings = (userId?: string) => {
  const [bookings, setBookings] = useState<BookingWithTalent[]>([]);
  const [isProUser, setIsProUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadBookingsOptimized = async () => {
      try {
        // Single optimized query with joins to get all data at once
        const [talentProfileResponse, bookingsResponse, supportBookingResponse] = await Promise.all([
          // Get user's talent profile
          supabase
            .from('talent_profiles')
            .select('id, is_pro_subscriber')
            .eq('user_id', userId)
            .maybeSingle(),
          
          // Get all bookings with talent info in one query
          supabase
            .from('bookings')
            .select(`
              id, user_id, talent_id, event_type, booker_name, booker_email, event_date, status,
              talent_profiles!inner(is_pro_subscriber)
            `)
            .or(`user_id.eq.${userId},talent_profiles.user_id.eq.${userId}`)
            .not('talent_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20),
          
          // Create support booking
          supabase.rpc('create_admin_support_booking', { user_id_param: userId })
        ]);

        if (talentProfileResponse.error && talentProfileResponse.error.code !== 'PGRST116') {
          throw talentProfileResponse.error;
        }

        const talentProfile = talentProfileResponse.data;
        setIsProUser(talentProfile?.is_pro_subscriber || false);

        // Process bookings
        let allBookings: BookingWithTalent[] = [];
        
        if (!bookingsResponse.error && bookingsResponse.data) {
          allBookings = bookingsResponse.data.map((booking: any) => ({
            id: booking.id,
            user_id: booking.user_id,
            talent_id: booking.talent_id,
            event_type: booking.event_type,
            booker_name: booking.booker_name,
            booker_email: booking.booker_email,
            event_date: booking.event_date,
            status: booking.status,
            talent_is_pro: booking.talent_profiles?.is_pro_subscriber || false
          }));
        }

        // Add support booking
        if (!supportBookingResponse.error && supportBookingResponse.data) {
          const supportBooking: BookingWithTalent = {
            id: supportBookingResponse.data,
            user_id: userId,
            talent_id: null,
            event_type: 'admin_support',
            booker_name: 'QTalents Support',
            status: 'confirmed',
            talent_is_pro: true
          };
          allBookings = [supportBooking, ...allBookings];
        }

        // Filter out declined/expired bookings efficiently
        const filteredBookings = allBookings.filter(booking => {
          if (booking.event_type === 'admin_support') return true;
          if (booking.status === 'declined') return false;
          if (booking.status === 'completed' && booking.event_date && new Date(booking.event_date) < new Date()) return false;
          return booking.talent_is_pro;
        });

        setBookings(filteredBookings);
      } catch (error) {
        console.error('Error loading bookings:', error);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookingsOptimized();
  }, [userId]);

  return { bookings, isProUser, loading };
};