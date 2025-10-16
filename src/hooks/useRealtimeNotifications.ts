import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useWebPushNotifications } from './useWebPushNotifications';

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { showNotification, isSupported } = useWebPushNotifications();

  useEffect(() => {
    if (!user) {
      console.log('[Notifications] No user, skipping real-time setup');
      return;
    }

    console.log('[Notifications] 🔔 Setting up real-time notifications for user:', user.id);

    // Set up real-time subscription for notifications
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
        async (payload) => {
          console.log('[Notifications] ✅ New notification received:', payload);
          const notification = payload.new as any;
          
          // Show toast notification for new notifications
          toast({
            title: notification?.title || 'New Notification',
            description: notification?.message || 'You have a new notification',
            duration: 5000,
          });

          // Show push notification if supported
          if (isSupported) {
            const url = notification?.booking_id 
              ? `/booker-dashboard?booking=${notification.booking_id}`
              : '/';
            
            await showNotification(
              notification?.title || 'New Notification',
              notification?.message || 'You have a new notification',
              url,
              notification?.booking_id
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Booking updated (booker):', payload);
          const booking = payload.new as any;
          
          // Show toast for booking status changes
          if (booking.status === 'accepted') {
            toast({
              title: 'Booking Accepted!',
              description: 'Your booking request has been accepted',
              duration: 5000,
            });
          } else if (booking.status === 'declined') {
            toast({
              title: 'Booking Declined',
              description: 'Your booking request has been declined',
              duration: 5000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Notifications] Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[Notifications] ✅ Successfully subscribed to notification updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Notifications] ❌ Channel subscription error');
        }
      });

    // Set up real-time subscription for talent bookings
    const talentBookingChannel = supabase
      .channel(`talent-bookings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        async (payload) => {
          console.log('Booking change detected:', payload);
          
          // Check if this booking involves the current user as talent
          const { data: talentProfile } = await supabase
            .from('talent_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
            
          if (talentProfile && payload.new && (payload.new as any).talent_id === talentProfile.id) {
            const booking = payload.new as any;
            
            if (payload.eventType === 'INSERT' && booking.status === 'pending_approval') {
              toast({
                title: 'New Booking Request!',
                description: `New booking request from ${booking.booker_name}`,
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Bookings] Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[Bookings] ✅ Successfully subscribed to booking updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Bookings] ❌ Channel subscription error');
        }
      });

    return () => {
      console.log('[Notifications] 🧹 Cleaning up real-time subscriptions');
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(talentBookingChannel);
    };
  }, [user, toast, showNotification, isSupported]);
};