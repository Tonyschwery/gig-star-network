import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUnreadMessages = (bookingId: string) => {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !bookingId) {
      setLoading(false);
      return;
    }

    const checkUnreadMessages = async () => {
      try {
        // Get the conversation for this booking
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('booking_id', bookingId)
          .single();

        if (!conversation) {
          setHasUnread(false);
          setLoading(false);
          return;
        }

        // Check for messages from other users (not from current user)
        const { data: messages } = await supabase
          .from('messages')
          .select('id, sender_id, created_at')
          .eq('conversation_id', conversation.id)
          .neq('sender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (messages && messages.length > 0) {
          setHasUnread(true);
        } else {
          setHasUnread(false);
        }
      } catch (error) {
        console.error('Error checking unread messages:', error);
        setHasUnread(false);
      } finally {
        setLoading(false);
      }
    };

    checkUnreadMessages();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`unread-messages-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          // If a new message is from someone else, mark as unread
          if ((payload.new as any).sender_id !== user.id) {
            checkUnreadMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, bookingId]);

  return { hasUnread, loading };
};
