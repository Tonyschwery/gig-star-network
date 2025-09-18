import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  booking_id?: string | null;
  event_request_id?: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at?: string;  // optional if you need it
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

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const openChat = (id: string, type: "booking" | "event_request") => {
    setChannelInfo({ id, type });
    setIsOpen(true);
    fetchMessages({ id, type });
  };

  const closeChat = () => {
    setIsOpen(false);
    setChannelInfo(null);
    setMessages([]);
  };

  const fetchMessages = async (info: ChannelInfo) => {
    console.log("[ChatContext] fetchMessages:", info);
    setLoadingMessages(true);
    try {
      const filterColumn = info.type === "booking" ? "booking_id" : "event_request_id";
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq(filterColumn, info.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[ChatContext] Error fetching messages:", error);
      } else {
        console.log("[ChatContext] fetched messages:", data);
        setMessages(data ?? []);
      }
    } catch (err) {
      console.error("[ChatContext] fetchMessages catch:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (content: string, userId: string) => {
    console.log("[ChatContext] sendMessage called with", { content, userId, channelInfo });
    if (!userId || !channelInfo || !content.trim()) {
      console.warn("[ChatContext] sendMessage aborted: missing data");
      return;
    }

    try {
      let insertObj: {
        booking_id?: string | null;
        event_request_id?: string | null;
        sender_id: string;
        content: string;
      } = {
        sender_id: userId,
        content: content.trim(),
      };

      if (channelInfo.type === "booking") {
        insertObj.booking_id = channelInfo.id;
        insertObj.event_request_id = null;
      } else {
        insertObj.event_request_id = channelInfo.id;
        insertObj.booking_id = null;
      }

      console.log("[ChatContext] Insert data:", insertObj);

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(insertObj)
        .select()  // this can help you see the inserted row in response
        .single();

      if (error) {
        console.error("[ChatContext] Error sending message:", error);
      } else {
        console.log("[ChatContext] Message sent and returned:", data);
        if (data) {
          setMessages(prev => [...prev, data]);
        }
      }
    } catch (err) {
      console.error("[ChatContext] sendMessage catch:", err);
    }
  };

  // Subscription to realtime (optional, but good to test)
  useEffect(() => {
    if (!channelInfo) return;

    const filterColumn = channelInfo.type === "booking" ? "booking_id" : "event_request_id";

    const subscription = supabase
      .channel("public:chat_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `${filterColumn}=eq.${channelInfo.id}`,
        },
        (payload) => {
          console.log("[ChatContext] realtime payload:", payload);
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channelInfo]);

  return (
    <ChatContext.Provider value={{
      isOpen,
      openChat,
      closeChat,
      messages,
      sendMessage,
      loadingMessages,
      channelInfo
    }}>
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
