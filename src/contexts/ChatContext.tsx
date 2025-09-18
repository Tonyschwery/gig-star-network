import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../supabaseClient'; // Adjust your import path

// Define your Message type matching the chat_messages table
export type Message = {
  id: string;
  booking_id?: string | null;
  event_request_id?: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type ChatContextType = {
  messages: Message[];
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

  // Load messages based on booking_id or event_request_id
  const loadMessages = async (id: string, type: 'booking' | 'event_request') => {
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
    }
  };

  // Send message function
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

      // Append new message to existing messages state
      setMessages((prev) => [...prev, data]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <ChatContext.Provider value={{ messages, loadMessages, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
};

// Hook to use ChatContext easily
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
