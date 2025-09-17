// FILE: src/contexts/ChatContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ChannelInfo {
  id: string;
  type: 'booking' | 'event_request';
}

interface ChatContextType {
  isOpen: boolean;
  openChat: (id: string, type: 'booking' | 'event_request') => void;
  closeChat: () => void;
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  loadingMessages: boolean;
  channelInfo: ChannelInfo | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);

  const openChat = useCallback((id: string, type: 'booking' | 'event_request') => {
    if (!id || !type) return;
    setChannelInfo({ id, type });
    setIsOpen(true);
  }, []);

  const closeChat = () => {
    setIsOpen(false);
    setChannelInfo(null);
    setMessages([]);
  };

  const fetchMessages = useCallback(async () => {
    if (!channelInfo) return;
    setLoadingMessages(true);
    const filterColumn = channelInfo.type === 'booking' ? 'booking_id' : 'event_request_id';
    const { data, error } = await supabase.from('chat_messages').select('*').eq(filterColumn, channelInfo.id).order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoadingMessages(false);
  }, [channelInfo]);

  useEffect(() => {
    if (isOpen && channelInfo) {
      fetchMessages();
      const subscription = supabase
        .channel(`chat-${channelInfo.type}-${channelInfo.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `${channelInfo.type === 'booking' ? 'booking_id' : 'event_request_id'}=eq.${channelInfo.id}`}, fetchMessages)
        .subscribe();
      return () => { supabase.removeChannel(subscription); };
    }
  }, [isOpen, channelInfo, fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!user || !channelInfo || !content.trim()) return;

    const messageData: any = { sender_id: user.id, content: content.trim() };
    if (channelInfo.type === 'booking') {
      messageData.booking_id = channelInfo.id;
    } else {
      messageData.event_request_id = channelInfo.id;
    }

    // The ONLY job of this function is to insert the message.
    // The database trigger will handle creating the notification automatically.
    const { error } = await supabase.from('chat_messages').insert(messageData);
    if (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <ChatContext.Provider value={{ isOpen, openChat, closeChat, messages, sendMessage, loadingMessages, channelInfo }}>
      {children}
    </ChatContext.Provider>
  );
};

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}