import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase.rpc('get_unread_message_count', {
          user_id_param: user.id
        });

        if (error) throw error;
        setUnreadCount(data || 0);
      } catch (error) {
        console.error('Error fetching unread message count:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          // If a new message is from someone else, refresh count
          if (payload.new.user_id !== user.id) {
            fetchUnreadCount();
            
            // Show browser notification if user doesn't have chat window open
            if ('Notification' in window && Notification.permission === 'granted') {
              // Simple notification without trying to get sender name
              new Notification('You have a new message', {
                icon: '/favicon.ico',
                badge: '/favicon.ico'
              });
            }
          }
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
          // If messages are marked as read, refresh count
          if (payload.new.is_read !== payload.old.is_read) {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Request notification permission on first load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return { unreadCount, loading };
};