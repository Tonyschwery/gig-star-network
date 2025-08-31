import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useRealtimeBookings = (refreshBookings: () => void) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time bookings subscription for user:', user.id);

    // Subscribe to booking changes for this user
    const bookingChannel = supabase
      .channel(`bookings-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        async (payload) => {
          console.log('Booking change detected:', payload);
          
          const booking = payload.new || payload.old;
          if (!booking) return;

          // Check if this booking involves the current user
          const isUserBooking = (booking as any).user_id === user.id;
          
          // Check if this is a talent booking
          const { data: talentProfile } = await supabase
            .from('talent_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
            
          const isTalentBooking = talentProfile && (booking as any).talent_id === talentProfile.id;

          if (isUserBooking || isTalentBooking) {
            console.log('Refreshing bookings due to real-time update');
            refreshBookings();
          }
        }
      )
      .subscribe((status) => {
        console.log('Booking subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('Cleaning up real-time bookings subscription');
      supabase.removeChannel(bookingChannel);
      setIsConnected(false);
    };
  }, [user, refreshBookings]);

  return { isConnected };
};