import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../supabaseClient'; // Make sure this file exists and path is correct

// Define Message type (matches your DB schema)
export type Message = {
  id: string;
  booking_id?: string | null;
  event_request_id?: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

// Add a type for channel info (optional, customize as needed)
type ChannelInfo = {
  id: string;
  type: 'booking' | 'event_request';
  targetId: string;
};

// Define ChatContextType with all properties your components expect
type ChatContextType = {
  messages: Message[];
  loadingMessages: boolean;
  isOpen: boolean;
  channelInfo: ChannelInfo | null;
  openChat: (id: string, type: 'booking' | 'event_request') => Promise<void>;
  closeChat: () => void;
  loadMessages: (id: string, type: 'booking' | 'event_request') => Promise<void>;
  sendMessage: (
    content: string,
    sender_id: string,
    target: { booking_id?: string; event_request_id?: string }
  ) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);

  // Load messages from DB
  const loadMessages = async (id: string, type: 'booking' | 'event_request') => {
    setLoadingMessages(true);
    try {
      const column = type === 'booking' ? 'booking_id' : 'event_request_id';
      const { data, error } = await supabase
        .from<Message>('chat_messages')
        .select('*')
        .eq(column, id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Open chat and load messages
  const openChat = async (id: string, type: 'booking' | 'event_request') => {
    setIsOpen(true);
    setChannelInfo({ id, type, targetId: id });
    await loadMessages(id, type);
  };

  // Close chat
  const closeChat = () => {
    setIsOpen(false);
    setMessages([]);
    setChannelInfo(null);
  };

  // Send message
  const sendMessage = async (
    content: string,
    sender_id: string,
    target: { booking_id?: string; event_request_id?: string }
  ) => {
    try {
      if (!target.booking_id && !target.event_request_id) {
        throw new Error('Either booking_id or event_request_id must be provided');
      }

      const messageToInsert = {
        content,
        sender_id,
        booking_id: target.booking_id ?? null,
        event_request_id: target.event_request_id ?? null,
      };

      const { data, error } = await supabase
        .from<Message>('chat_messages')
        .insert(messageToInsert)
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => [...prev, data]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        loadingMessages,
        isOpen,
        channelInfo,
        openChat,
        closeChat,
        loadMessages,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
