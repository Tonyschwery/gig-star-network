import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  booking_id?: string;
  event_request_id?: string;
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
  sendMessage: (content: string, userId?: string) => Promise<void>;
  loadingMessages: boolean;
  channelInfo: ChannelInfo | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  // Listen for custom chat open events
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
    
    // Clear any existing timer
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
    }
    
    setChannelInfo({ id, type });
    setIsOpen(true);
    
    // Set auto-close timer for 5 seconds
    const timer = setTimeout(() => {
      setIsOpen(false);
      setChannelInfo(null);
      setMessages([]);
      setAutoCloseTimer(null);
    }, 5000);
    
    setAutoCloseTimer(timer);
  };

  const closeChat = () => {
    // Clear any existing timer
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
    
    setIsOpen(false);
    setChannelInfo(null);
    setMessages([]);
  };

  const fetchMessages = async (info: ChannelInfo) => {
    setLoadingMessages(true);
    try {
      const filterColumn = info.type === "booking" ? "booking_id" : "event_request_id";
      
      let query = supabase
        .from("chat_messages")
        .select("id, sender_id, content, created_at, booking_id, event_request_id")
        .order("created_at", { ascending: true });

      if (info.type === "booking") {
        query = query.eq("booking_id", info.id);
      } else {
        query = query.eq("event_request_id", info.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const typedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        sender_id: msg.sender_id,
        content: msg.content,
        created_at: msg.created_at,
        booking_id: msg.booking_id,
        event_request_id: msg.event_request_id,
      }));

      setMessages(typedMessages);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Realtime subscription and auto-open functionality
  useEffect(() => {
    if (!channelInfo) return;

    fetchMessages(channelInfo);

    const filterColumn =
      channelInfo.type === "booking" ? "booking_id" : "event_request_id";

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

  // Auto-open chat when receiving messages (safest implementation)
  useEffect(() => {
    if (!user?.id) return;

    const autoOpenSubscription = supabase
      .channel("auto-open-chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Only auto-open if message is not from current user and chat is not already open
          if (newMessage.sender_id !== user.id && !isOpen) {
            // Check if this message is for the current user
            let shouldAutoOpen = false;
            let messageChannelInfo: ChannelInfo | null = null;

            if (newMessage.booking_id) {
              const { data: booking } = await supabase
                .from('bookings')
                .select('user_id, talent_id')
                .eq('id', newMessage.booking_id)
                .single();
              
              if (booking) {
                // Check if current user is the booker
                if (booking.user_id === user.id) {
                  shouldAutoOpen = true;
                  messageChannelInfo = { id: newMessage.booking_id, type: 'booking' };
                } else {
                  // Check if current user is the talent
                  const { data: talent } = await supabase
                    .from('talent_profiles')
                    .select('user_id')
                    .eq('id', booking.talent_id)
                    .single();
                  
                  if (talent?.user_id === user.id) {
                    shouldAutoOpen = true;
                    messageChannelInfo = { id: newMessage.booking_id, type: 'booking' };
                  }
                }
              }
            } else if (newMessage.event_request_id) {
              const { data: eventRequest } = await supabase
                .from('event_requests')
                .select('user_id')
                .eq('id', newMessage.event_request_id)
                .single();

              if (eventRequest?.user_id === user.id) {
                shouldAutoOpen = true;
                messageChannelInfo = { id: newMessage.event_request_id, type: 'event_request' };
              }
            }

            if (shouldAutoOpen && messageChannelInfo) {
              // Clear any existing timer
              if (autoCloseTimer) {
                clearTimeout(autoCloseTimer);
              }
              
              setChannelInfo(messageChannelInfo);
              setIsOpen(true);
              
              // Set auto-close timer for 5 seconds
              const timer = setTimeout(() => {
                setIsOpen(false);
                setChannelInfo(null);
                setMessages([]);
                setAutoCloseTimer(null);
              }, 5000);
              
              setAutoCloseTimer(timer);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(autoOpenSubscription);
    };
  }, [user?.id, isOpen]);

  // ✅ Fixed sendMessage function
  const sendMessage = async (content: string, userId?: string) => {
    if (!userId || !channelInfo || !content.trim()) return;

    try {
      const insertData =
        channelInfo.type === "booking"
          ? {
              booking_id: channelInfo.id,
              sender_id: userId, // explicitly use sender_id
              content: content.trim(),
            }
          : {
              event_request_id: channelInfo.id,
              sender_id: userId, // explicitly use sender_id
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
