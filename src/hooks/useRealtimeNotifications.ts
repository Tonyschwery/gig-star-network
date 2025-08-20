import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for new notifications
    const notificationChannel = supabase
      .channel(`notifications-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new as any;
          
          // Show toast notification for new notifications
          toast({
            title: notification?.title || 'New Notification',
            description: notification?.message || 'You have a new notification',
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const booking = payload.new as any;
          
          // Show toast for new bookings received by bookers
          toast({
            title: "Booking Updated",
            description: `Your ${booking?.event_type || 'event'} booking status has been updated.`,
            duration: 5000,
          });
        }
      )
      .subscribe();

    // Set up subscription for booking status updates only (not new bookings to avoid duplicates)
    const bookingUpdatesChannel = supabase
      .channel(`booking-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings'
        },
        async (payload) => {
          const booking = payload.new as any;
          const oldBooking = payload.old as any;
          
          // Only show notifications for status changes, not for other updates
          if (booking.status === oldBooking.status) return;
          
          // Check if this booking is for the current user (as booker)
          if (booking.user_id === user.id) {
            toast({
              title: "Booking Status Updated",
              description: `Your ${booking?.event_type || 'event'} booking status changed to ${booking.status}.`,
              duration: 5000,
            });
          }
          
          // Check if this booking is for the current user's talent profile
          const { data: talentProfile } = await supabase
            .from('talent_profiles')
            .select('id')
            .eq('user_id', user.id)
            .eq('id', booking.talent_id)
            .single();

          if (talentProfile) {
            toast({
              title: "Booking Status Updated",
              description: `A ${booking?.event_type || 'event'} booking status changed to ${booking.status}.`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(bookingUpdatesChannel);
    };
  }, [user, toast]);
};