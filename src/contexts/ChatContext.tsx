import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface ChannelInfo {
  type: "booking" | "event_request";
  id: string;
}

export interface Message {
  id: string;
  created_at: string;
  sender_id: string;
  content: string;
  booking_id?: string | null;
  event_request_id?: string | null;
}

interface ChatContextType {
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  loading: boolean;
  loadingMessages: boolean;
  error: string | null;
  isOpen: boolean;
  openChat: (id: string, type: "booking" | "event_request") => Promise<void>;
  closeChat: () => void;
  channelInfo: ChannelInfo | null;
  setUserInteracting: (isInteracting: boolean) => void;
  viewedChats: Set<string>;
  markAllAsRead: (ids: string[], type: "booking" | "event_request") => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageChannel, setMessageChannel] = useState<RealtimeChannel | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [userInteracting, setUserInteracting] = useState(false);
  const [viewedChats, setViewedChats] = useState<Set<string>>(new Set());

  // Load messages when channel changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!channelInfo) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);
      try {
        const query = supabase.from("chat_messages").select("*").order("created_at", { ascending: true });

        if (channelInfo.type === "booking") {
          query.eq("booking_id", channelInfo.id);
        } else {
          query.eq("event_request_id", channelInfo.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setMessages(data || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [channelInfo]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (messageChannel) {
      messageChannel.unsubscribe();
    }
    if (user && channelInfo) {
      const channel = supabase
        .channel(`chat_${channelInfo.type}_${channelInfo.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
          const newMessage = payload.new as Message;
          const isRelevant =
            (channelInfo.type === "booking" && newMessage.booking_id === channelInfo.id) ||
            (channelInfo.type === "event_request" && newMessage.event_request_id === channelInfo.id);

          if (isRelevant) {
            setMessages((prev) => [...prev, newMessage]);
          }
        })
        .subscribe();
      setMessageChannel(channel);
    }
    return () => {
      messageChannel?.unsubscribe();
    };
  }, [user, channelInfo]);

  const openChat = useCallback(
    async (id: string, type: "booking" | "event_request") => {
      if (!user) return;
      setChannelInfo({ type, id });
      setIsOpen(true);
      // Mark this chat as viewed
      setViewedChats((prev) => new Set(prev).add(`${type}_${id}`));
    },
    [user],
  );

  const closeChat = () => {
    setIsOpen(false);
    setChannelInfo(null);
    setMessages([]);
  };

  const markAllAsRead = useCallback((ids: string[], type: "booking" | "event_request") => {
    setViewedChats((prev) => {
      const newSet = new Set(prev);
      ids.forEach(id => newSet.add(`${type}_${id}`));
      return newSet;
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !channelInfo) return;

      // ✅ REMOVED the redundant filter that was causing the conflict.
      // All filtering is now correctly handled by the UI component.

      const messageData: any = {
        sender_id: user.id,
        content,
      };

      if (channelInfo.type === "booking") {
        messageData.booking_id = channelInfo.id;
      } else {
        messageData.event_request_id = channelInfo.id;
      }

      const { error } = await supabase.from("chat_messages").insert(messageData);

      if (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Could not send message.",
          variant: "destructive",
        });
      }
    },
    [user, channelInfo, toast], // Removed isProUser from dependency array
  );

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        loading,
        loadingMessages,
        error,
        isOpen,
        openChat,
        closeChat,
        channelInfo,
        setUserInteracting,
        viewedChats,
        markAllAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
