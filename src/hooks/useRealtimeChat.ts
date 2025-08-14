import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RealtimeMessage {
  id: string; // unique id per message
  content: string;
  senderId: string;
  createdAt: string;
}

export const buildChannelId = (bookerId: string, talentId: string, eventType: string) => {
  const slug = (eventType || "").toLowerCase().replace(/\s+/g, "-");
  return `chat:${bookerId}:${talentId}:${slug}`;
};

export const useRealtimeChat = (channelId?: string, userId?: string) => {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [isReady, setIsReady] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Connect to channel
  useEffect(() => {
    if (!channelId || !userId) {
      setIsReady(false);
      setMessages([]); // Clear messages when no channel
      return;
    }

    // Clear messages when switching channels
    setMessages([]);
    setIsReady(false);

    const channel = supabase.channel(channelId, {
      config: {
        broadcast: { ack: true },
        presence: { key: userId }
      }
    });

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        const msg = payload.payload as RealtimeMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
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
  }, [channelId, userId]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !channelRef.current || !userId) return;
    const message: RealtimeMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: text.trim(),
      senderId: userId,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, message]);
    await channelRef.current.send({ type: 'broadcast', event: 'message', payload: message });
  };

  return { messages, sendMessage, isReady };
};
