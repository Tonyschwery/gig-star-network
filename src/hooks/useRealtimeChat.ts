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

  console.log('useRealtimeChat: Called with bookingId:', bookingId, 'userId:', userId);

  // Load existing messages and set up real-time subscription
  useEffect(() => {
    console.log('useRealtimeChat: useEffect triggered, bookingId:', bookingId, 'userId:', userId);
    
    if (!bookingId || !userId) {
      console.log('useRealtimeChat: Missing bookingId or userId, resetting state');
      setIsReady(false);
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        console.log('useRealtimeChat: Loading messages for booking:', bookingId);
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id, content, sender_id, created_at')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('useRealtimeChat: Error loading messages:', error);
          throw error;
        }

        console.log('useRealtimeChat: Loaded messages:', data);
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
    console.log('useRealtimeChat: Setting up real-time subscription for booking:', bookingId);
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
          console.log('useRealtimeChat: Received new message:', payload);
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
        console.log('useRealtimeChat: Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('useRealtimeChat: Successfully subscribed, setting isReady to true');
          setIsReady(true);
        } else {
          console.log('useRealtimeChat: Not subscribed, setting isReady to false');
          setIsReady(false);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('useRealtimeChat: Cleaning up subscription for booking:', bookingId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsReady(false);
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
