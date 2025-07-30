import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useGigOpportunityNotifications = (talentId: string) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !talentId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const fetchGigOpportunityUnreadCount = async () => {
      try {
        // Count unread messages in gig opportunity conversations
        const { data: gigMessages, error: messagesError } = await supabase
          .from('messages')
          .select(`
            id,
            conversation_id,
            user_id,
            is_read,
            conversations!inner (
              booking_id,
              gig_application_id,
              gig_applications!conversations_gig_application_id_fkey!inner (
                talent_id
              ),
              bookings!conversations_booking_id_fkey!inner (
                is_gig_opportunity
              )
            )
          `)
          .eq('is_read', false)
          .neq('user_id', user.id)
          .not('conversations.gig_application_id', 'is', null) // Only gig opportunities
          .eq('conversations.gig_applications.talent_id', talentId)
          .eq('conversations.bookings.is_gig_opportunity', true);

        if (messagesError) throw messagesError;

        // Count unread notifications for gig opportunities
        const { data: gigNotifications, error: notificationsError } = await supabase
          .from('notifications')
          .select(`
            id,
            booking_id,
            is_read,
            bookings!notifications_booking_id_fkey!inner (
              is_gig_opportunity
            )
          `)
          .eq('user_id', user.id)
          .eq('is_read', false)
          .eq('bookings.is_gig_opportunity', true);

        if (notificationsError) throw notificationsError;

        const messageCount = gigMessages?.length || 0;
        const notificationCount = gigNotifications?.length || 0;
        setUnreadCount(messageCount + notificationCount);
      } catch (error) {
        console.error('Error fetching gig opportunity unread count:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchGigOpportunityUnreadCount();

    // Set up real-time subscriptions for gig opportunity messages
    const messagesChannel = supabase
      .channel(`gig-opportunity-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchGigOpportunityUnreadCount();
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
            fetchGigOpportunityUnreadCount();
          }
        }
      )
      .subscribe();

    // Set up real-time subscriptions for gig opportunity notifications
    const notificationsChannel = supabase
      .channel(`gig-opportunity-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchGigOpportunityUnreadCount();
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
            fetchGigOpportunityUnreadCount();
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