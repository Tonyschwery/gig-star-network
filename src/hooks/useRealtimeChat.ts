import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RealtimeMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

export const useRealtimeChat = (bookingId?: string, userId?: string) => {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [isReady, setIsReady] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!bookingId || !userId) {
      setIsReady(false);
      setMessages([]);
      return;
    }

    let mounted = true;

    const setupChat = async () => {
      try {
        // Load messages and setup subscription in parallel
        const [messagesResponse, channel] = await Promise.all([
          supabase
            .from('chat_messages')
            .select('id, content, sender_id, created_at')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: true }),
          
          // Setup real-time subscription immediately
          supabase
            .channel(`chat-${bookingId}`)
            .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `booking_id=eq.${bookingId}`
            }, (payload) => {
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
            })
            .subscribe()
        ]);

        if (!mounted) return;

        if (messagesResponse.error) throw messagesResponse.error;

        setMessages(messagesResponse.data?.map(msg => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.sender_id,
          createdAt: msg.created_at,
        })) || []);

        channelRef.current = channel;
        setIsReady(true);

      } catch (error) {
        if (mounted) {
          setIsReady(false);
        }
      }
    };

    setupChat();

    return () => {
      mounted = false;
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
