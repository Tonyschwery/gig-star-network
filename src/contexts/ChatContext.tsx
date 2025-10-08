import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Conversation {
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
  };
}

interface Message {
  id: number;
  created_at: string;
  sender_id: string;
  content: string;
  conversation_id: number; // Added for clarity
}

interface ChatContextType {
  conversations: Conversation[];
  messages: Message[];
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, bookingId?: number, eventRequestId?: number) => Promise<void>;
  loading: boolean;
  error: string | null;
  setUserInteracting: (isInteracting: boolean) => void; // ✅ FIX: Add setUserInteracting to the context type
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageChannel, setMessageChannel] = useState<RealtimeChannel | null>(null);
  const [userInteracting, setUserInteracting] = useState(false); // ✅ FIX: Add state for user interaction

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.rpc("get_user_conversations", { p_user_id: user.id });
        if (error) throw error;
        setConversations(data || []);
      } catch (e: any) {
        setError(e.message);
        console.error("Error fetching conversations:", e);
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
        .channel(`chat_messages`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (payload) => {
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
          console.error("Error fetching messages:", e);
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
  }, [activeConversation, user]);

  const sendMessage = useCallback(
    async (content: string, bookingId?: number, eventRequestId?: number) => {
      if (!user || !activeConversation) return;

      const { data: profile } = await supabase
        .from("talent_profiles")
        .select("is_pro_subscriber")
        .eq("user_id", user.id)
        .single();

      const isPro = profile?.is_pro_subscriber || false;

      if (!isPro) {
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
        booking_id: bookingId,
        event_request_id: eventRequestId,
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
    [user, activeConversation, supabase, toast],
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
        setUserInteracting, // ✅ FIX: Provide setUserInteracting in the context value
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
