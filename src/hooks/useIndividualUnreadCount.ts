import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useChat } from '@/contexts/ChatContext';

export const useIndividualUnreadCount = (
  channelId: string, 
  channelType: 'booking' | 'event_request'
) => {
  const { user } = useAuth();
  const { viewedChats } = useChat();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !channelId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        // Check if this chat has been viewed
        const chatKey = `${channelType}_${channelId}`;
        if (viewedChats.has(chatKey)) {
          setUnreadCount(0);
          setLoading(false);
          return;
        }

        // Get messages for this specific channel
        const query = supabase
          .from('chat_messages')
          .select('sender_id, created_at')
          .order('created_at', { ascending: false });

        if (channelType === 'booking') {
          query.eq('booking_id', channelId);
        } else {
          query.eq('event_request_id', channelId);
        }

        const { data: messages } = await query;

        if (!messages || messages.length === 0) {
          setUnreadCount(0);
          setLoading(false);
          return;
        }

        // Count consecutive messages from the other party (starting from most recent)
        let count = 0;
        for (const message of messages) {
          if (message.sender_id !== user.id) {
            count++;
          } else {
            break; // Stop at the first message from current user
          }
        }

        setUnreadCount(count);
      } catch (error) {
        console.error('Error fetching individual unread count:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Set up real-time subscription for this specific channel
    const channel = supabase
      .channel(`unread-individual-${channelType}-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: channelType === 'booking' 
            ? `booking_id=eq.${channelId}`
            : `event_request_id=eq.${channelId}`
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
  }, [user, channelId, channelType, viewedChats]);

  return { unreadCount, loading };
};
