import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUnreadNotifications = () => {
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
        // Count unread notifications
        const { data: notifications, error: notificationError } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (notificationError) throw notificationError;

        const totalUnread = (notifications?.length || 0);
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error fetching unread count:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Set up real-time subscription for notifications
    const notificationChannel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();


    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [user]);

  return { unreadCount, loading };
};