import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  booking_id?: string | null;
  event_request_id?: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ChannelInfo {
  id: string;
  type: "booking" | "event_request";
}

interface ChatContextType {
  isOpen: boolean;
  openChat: (id: string, type: "booking" | "event_request") => void;
  closeChat: () => void;
  messages: Message[];
  sendMessage: (content: string, userId: string) => Promise<void>;
  loadingMessages: boolean;
  channelInfo: ChannelInfo | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);

  useEffect(() => {
    const handleOpenChat = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        type: "booking" | "event_request";
      }>;
      const { id, type } = customEvent.detail;
      if (id && type) {
        setChannelInfo({ id, type });
        setIsOpen(true);
      }
    };

    window.addEventListener("openChat", handleOpenChat);
    return () => {
      window.removeEventListener("openChat", handleOpenChat);
    };
  }, []);

  const openChat = (id: string, type: "booking" | "event_request") => {
    if (!id || !type) return;
    setChannelInfo({ id, type });
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
    setChannelInfo(null);
    setMessages([]);
  };

  const fetchMessages = async (info: ChannelInfo) => {
    setLoadingMessages(true);
    try {
      const filterColumn = info.type === "booking" ? "booking_id" : "event_request_id";

      const { data, error } = await supabase
        .from<Message>("chat_messages")
        .select("*")
        .eq(filterColumn, info.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!channelInfo) return;

    fetchMessages(channelInfo);

    const filterColumn = channelInfo.type === "booking" ? "booking_id" : "event_request_id";

    const subscription = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `${filterColumn}=eq.${channelInfo.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channelInfo]);

  const sendMessage = async (content: string, userId: string) => {
    if (!userId || !channelInfo || !content.trim()) return;

    try {
      const insertData =
        channelInfo.type === "booking"
          ? {
              booking_id: channelInfo.id,
              sender_id: userId,
              content: content.trim(),
            }
          : {
              event_request_id: channelInfo.id,
              sender_id: userId,
              content: content.trim(),
            };

      const { error } = await supabase.from("chat_messages").insert(insertData);

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        openChat,
        closeChat,
        messages,
        sendMessage,
        loadingMessages,
        channelInfo,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
