// FILE: src/contexts/ChatContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';

// Simple manual query without full supabase types to avoid circular dependency
const supabaseUrl = "https://myxizupccweukrxfdqmc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eGl6dXBjY3dldWtyeGZkcW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5Mjk4ODQsImV4cCI6MjA2ODUwNTg4NH0.KiikwI4cv2x4o0bPavrHtofHD8_VdK7INEAWdHsNRpE";

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

  const openChat = (id: string, type: 'booking' | 'event_request') => {
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
      const filterColumn = info.type === 'booking' ? 'booking_id' : 'event_request_id';
      
      // Use fetch directly to avoid type issues
      const response = await fetch(`${supabaseUrl}/rest/v1/chat_messages?${filterColumn}=eq.${info.id}&select=id,sender_id,content,created_at&order=created_at.asc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data || []);
      } else {
        console.error('Error fetching messages:', response.statusText);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (isOpen && channelInfo) {
      fetchMessages(channelInfo);
    }
  }, [isOpen, channelInfo]);

  const sendMessage = async (content: string, userId?: string) => {
    if (!userId || !channelInfo || !content.trim()) return;

    const messageData: any = { 
      sender_id: userId, 
      content: content.trim() 
    };
    
    if (channelInfo.type === 'booking') {
      messageData.booking_id = channelInfo.id;
    } else {
      messageData.event_request_id = channelInfo.id;
    }

    // Use fetch directly to avoid type issues
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });
      
      if (!response.ok) {
        console.error('Error sending message:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

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
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}