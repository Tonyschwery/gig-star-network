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
        console.log('Loading bookings for user:', userId);
        
        // Get user's talent profile and support booking in parallel
        const [talentProfileResponse, supportBookingResponse] = await Promise.all([
          supabase
            .from('talent_profiles')
            .select('id, is_pro_subscriber')
            .eq('user_id', userId)
            .maybeSingle(),
          
          supabase.rpc('create_admin_support_booking', { user_id_param: userId })
        ]);

        // Get separate booking queries to ensure we get ALL relevant bookings
        const [bookerBookingsResponse, talentBookingsResponse] = await Promise.all([
          // Bookings where user is the booker
          supabase
            .from('bookings_secure')
            .select(`
              id, user_id, talent_id, event_type, booker_name, booker_email, event_date, status,
              talent_profiles(is_pro_subscriber)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20),
          
          // Bookings where user is the talent (if they have a talent profile)
          talentProfileResponse.data ? supabase
            .from('bookings_secure')
            .select(`
              id, user_id, talent_id, event_type, booker_name, booker_email, event_date, status,
              talent_profiles(is_pro_subscriber)
            `)
            .eq('talent_id', talentProfileResponse.data.id)
            .order('created_at', { ascending: false })
            .limit(20) : Promise.resolve({ data: [], error: null })
        ]);

        if (talentProfileResponse.error && talentProfileResponse.error.code !== 'PGRST116') {
          throw talentProfileResponse.error;
        }

        const talentProfile = talentProfileResponse.data;
        setIsProUser(talentProfile?.is_pro_subscriber || false);

        // Combine all bookings from both queries
        let allBookings: BookingWithTalent[] = [];
        
        // Add booker bookings
        if (!bookerBookingsResponse.error && bookerBookingsResponse.data) {
          const bookerBookings = bookerBookingsResponse.data.map((booking: any) => ({
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
          allBookings.push(...bookerBookings);
        }
        
        // Add talent bookings (avoid duplicates)
        if (!talentBookingsResponse.error && talentBookingsResponse.data) {
          const talentBookings = talentBookingsResponse.data.map((booking: any) => ({
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
          
          // Only add talent bookings that aren't already in the array
          talentBookings.forEach(talentBooking => {
            if (!allBookings.find(b => b.id === talentBooking.id)) {
              allBookings.push(talentBooking);
            }
          });
        }
        
        console.log('Found bookings:', allBookings.length, allBookings);

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

        // Filter out only declined/expired bookings - keep ALL others for chat
        const filteredBookings = allBookings.filter(booking => {
          if (booking.event_type === 'admin_support') return true;
          if (booking.status === 'declined') return false;
          if (booking.status === 'completed' && booking.event_date && new Date(booking.event_date) < new Date()) return false;
          return true; // Show ALL active bookings regardless of Pro status
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