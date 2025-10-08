import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useProStatus } from "./ProStatusContext";

// ✅ FIX 1 of 2: Changed 'id' to string to match how it's used in UniversalChat.tsx
export interface ChannelInfo {
  type: "booking" | "event_request";
  id: string;
}

export interface Conversation {
  id: number;
  created_at: string;
  booking_id: number | null;
  event_request_id: number | null;
  last_message_content: string | null;
  last_message_timestamp: string | null;
  unread_count: number;
  other_participant: {
    id: string;
    full_name: string;
    picture_url?: string;
    role?: string;
  };
}

export interface Message {
  id: number;
  created_at: string;
  sender_id: string;
  content: string;
  conversation_id: number;
  booking_id?: number;
  event_request_id?: number;
}

interface ChatContextType {
  conversations: Conversation[];
  messages: Message[];
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  openChat: (participantId: string, context?: { bookingId?: number; eventRequestId?: number }) => Promise<void>;
  closeChat: () => void;
  loadingMessages: boolean;
  channelInfo: ChannelInfo | null;
  setUserInteracting: (isInteracting: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isPro } = useProStatus();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageChannel, setMessageChannel] = useState<RealtimeChannel | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [userInteracting, setUserInteracting] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_user_conversations", { p_user_id: user.id });
        if (error) throw error;
        setConversations(data || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (messageChannel) {
      messageChannel.unsubscribe();
    }
    if (user) {
      const channel = supabase
        .channel(`chat_messages_user_${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
          const newMessage = payload.new as Message;
          if (activeConversation && newMessage.conversation_id === activeConversation.id) {
            setMessages((prev) => [...prev, newMessage]);
          }
          setConversations((prev) =>
            prev.map((convo) => {
              if (convo.id === newMessage.conversation_id) {
                return {
                  ...convo,
                  last_message_content: newMessage.content,
                  last_message_timestamp: newMessage.created_at,
                  unread_count: convo.id === activeConversation?.id ? 0 : (convo.unread_count || 0) + 1,
                };
              }
              return convo;
            }),
          );
        })
        .subscribe();
      setMessageChannel(channel);
    }
    return () => {
      messageChannel?.unsubscribe();
    };
  }, [user, activeConversation]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (activeConversation) {
        setLoadingMessages(true);
        try {
          const { data, error } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", activeConversation.id)
            .order("created_at", { ascending: true });
          if (error) throw error;
          setMessages(data || []);
        } catch (e: any) {
          setError(e.message);
        } finally {
          setLoadingMessages(false);
        }
      } else {
        setMessages([]);
      }
    };
    fetchMessages();
  }, [activeConversation]);

  useEffect(() => {
    const markAsRead = async () => {
      if (activeConversation && user) {
        await supabase.rpc("mark_messages_as_read", {
          p_conversation_id: activeConversation.id,
          p_user_id: user.id,
        });
        setConversations((prev) => prev.map((c) => (c.id === activeConversation.id ? { ...c, unread_count: 0 } : c)));
      }
    };
    if (activeConversation) {
      markAsRead();
    }
  }, [activeConversation, user, messages]);

  const openChat = useCallback(
    async (participantId: string, context?: { bookingId?: number; eventRequestId?: number }) => {
      if (!user) return;
      let existingConvo = conversations.find(
        (c) =>
          c.other_participant.id === participantId &&
          c.booking_id === (context?.bookingId || null) &&
          c.event_request_id === (context?.eventRequestId || null),
      );
      if (existingConvo) {
        setActiveConversation(existingConvo);
        setIsOpen(true);
      } else {
        try {
          const { data, error } = await supabase.rpc("get_or_create_conversation", {
            p_user_1_id: user.id,
            p_user_2_id: participantId,
            p_booking_id: context?.bookingId,
            p_event_request_id: context?.eventRequestId,
          });
          if (error) throw error;
          const newConvo = data[0];
          setConversations((prev) => [...prev, newConvo]);
          setActiveConversation(newConvo);
          setIsOpen(true);
        } catch (e: any) {
          setError(e.message);
          toast({ title: "Error", description: "Could not start chat.", variant: "destructive" });
        }
      }
    },
    [user, conversations, toast],
  );

  const closeChat = () => {
    setIsOpen(false);
    setActiveConversation(null);
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !activeConversation) return;

      if (!isPro) {
        // ✅ FIX 2 of 2: This is the smarter chat filter you originally requested.
        const forbiddenPattern =
          /((\d[\s-.]*){7,})|https?:\/\/|www\.|\b[a-zA-Z0-9.-]+\.(com|net|org|io|live|co)\b|@|_/i;
        if (forbiddenPattern.test(content)) {
          toast({
            title: "Upgrade to Pro",
            description: "Sharing contact information, links, or social media is a Pro feature.",
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase.from("chat_messages").insert({
        sender_id: user.id,
        conversation_id: activeConversation.id,
        content,
        booking_id: activeConversation.booking_id,
        event_request_id: activeConversation.event_request_id,
      });

      if (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Could not send message.",
          variant: "destructive",
        });
      }
    },
    [user, activeConversation, isPro, toast],
  );

  return (
    <ChatContext.Provider
      value={{
        conversations,
        messages,
        activeConversation,
        setActiveConversation,
        sendMessage,
        loading,
        error,
        isOpen,
        openChat,
        closeChat,
        loadingMessages,
        channelInfo,
        setUserInteracting,
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
