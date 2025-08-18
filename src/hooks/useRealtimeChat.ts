import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RealtimeMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

// Convert booking to channel name for consistency
export const buildChannelId = (bookingId: string) => {
  return `booking-chat:${bookingId}`;
};

export const useRealtimeChat = (bookingId?: string, userId?: string) => {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [isReady, setIsReady] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load existing messages and set up real-time subscription
  useEffect(() => {
    if (!bookingId || !userId) {
      setIsReady(false);
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id, content, sender_id, created_at')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages(data?.map(msg => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.sender_id,
          createdAt: msg.created_at,
        })) || []);
      } catch (error) {
        console.error('Error loading chat messages:', error);
      }
    };

    loadMessages();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`chat_messages:booking_id=eq.${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          const newMessage = payload.new;
          const msg: RealtimeMessage = {
            id: newMessage.id,
            content: newMessage.content,
            senderId: newMessage.sender_id,
            createdAt: newMessage.created_at,
          };
          
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsReady(true);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [bookingId, userId]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !bookingId || !userId) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          booking_id: bookingId,
          sender_id: userId,
          content: text.trim(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return { messages, sendMessage, isReady };
};
