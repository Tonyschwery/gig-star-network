import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useChat } from '@/contexts/ChatContext';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const { viewedChats } = useChat();
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
        // Get user's bookings (both as booker and talent)
        const { data: asBooker } = await supabase
          .from('bookings')
          .select('id')
          .eq('user_id', user.id);

        const { data: talentProfile } = await supabase
          .from('talent_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        let asTalent: any[] = [];
        if (talentProfile?.id) {
          const { data } = await supabase
            .from('bookings')
            .select('id')
            .eq('talent_id', talentProfile.id);
          asTalent = data || [];
        }

        const allBookingIds = [
          ...((asBooker || []).map(b => b.id)),
          ...(asTalent.map(b => b.id))
        ];

        if (allBookingIds.length === 0) {
          setUnreadCount(0);
          setLoading(false);
          return;
        }

        // Get the latest message for each booking and check if it's from the other party
        let totalUnread = 0;
        
        for (const bookingId of allBookingIds) {
          // Skip if this chat has been viewed
          if (viewedChats.has(`booking_${bookingId}`)) {
            continue;
          }

          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('sender_id, created_at')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // If the last message exists and it's not from the current user, count as unread
          if (lastMessage && lastMessage.sender_id !== user.id) {
            totalUnread++;
          }
        }

        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error fetching unread messages count:', error);
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
          table: 'chat_messages'
        },
        (payload) => {
          // Only update count if the message is not from the current user
          if (payload.new.sender_id !== user.id) {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, viewedChats]);

  return { unreadCount, loading };
};
