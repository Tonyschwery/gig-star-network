import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useDirectBookingNotifications = (talentId: string) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !talentId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const fetchDirectBookingUnreadCount = async () => {
      try {
        // Count unread messages in direct booking conversations
        const { data: directBookingMessages, error: messagesError } = await supabase
          .from('messages')
          .select(`
            id,
            conversation_id,
            user_id,
            is_read,
            conversations!inner (
              booking_id,
              gig_application_id,
              bookings!conversations_booking_id_fkey!inner (
                talent_id,
                is_gig_opportunity
              )
            )
          `)
          .eq('is_read', false)
          .neq('user_id', user.id)
          .is('conversations.gig_application_id', null) // Only direct bookings
          .eq('conversations.bookings.talent_id', talentId)
          .eq('conversations.bookings.is_gig_opportunity', false);

        if (messagesError) throw messagesError;

        // Count unread notifications for direct bookings
        const { data: directBookingNotifications, error: notificationsError } = await supabase
          .from('notifications')
          .select(`
            id,
            booking_id,
            is_read,
            bookings!notifications_booking_id_fkey!inner (
              talent_id,
              is_gig_opportunity
            )
          `)
          .eq('user_id', user.id)
          .eq('is_read', false)
          .eq('bookings.talent_id', talentId)
          .eq('bookings.is_gig_opportunity', false);

        if (notificationsError) throw notificationsError;

        const messageCount = directBookingMessages?.length || 0;
        const notificationCount = directBookingNotifications?.length || 0;
        setUnreadCount(messageCount + notificationCount);
      } catch (error) {
        console.error('Error fetching direct booking unread count:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectBookingUnreadCount();

    // Set up real-time subscriptions for direct booking messages
    const messagesChannel = supabase
      .channel(`direct-booking-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchDirectBookingUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (payload.new.is_read !== payload.old.is_read) {
            fetchDirectBookingUnreadCount();
          }
        }
      )
      .subscribe();

    // Set up real-time subscriptions for direct booking notifications
    const notificationsChannel = supabase
      .channel(`direct-booking-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchDirectBookingUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          if (payload.new.is_read !== payload.old.is_read) {
            fetchDirectBookingUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user, talentId]);

  return { unreadCount, loading };
};