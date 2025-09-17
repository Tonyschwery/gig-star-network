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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, fetchMessages)
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

    const { error: messageError } = await supabase
      .from('chat_messages')
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      console.error('Error sending message:', messageError);
      return;
    }

    try {
      let recipientId: string | undefined;
      let notificationMessage = '';
      let link_to = '';
      
      const isAdmin = user.email === 'admin@qtalent.live';

      if (channelInfo.type === 'booking') {
        const { data: booking } = await supabase.from('bookings').select('user_id, talent_id, event_type, talent_profiles(artist_name)').eq('id', channelInfo.id).single();
        if (!booking) return;

        recipientId = user.id === booking.user_id ? booking.talent_id : booking.user_id;
        const senderName = user.id === booking.user_id ? "A Booker" : booking.talent_profiles?.artist_name;
        notificationMessage = `New message from ${senderName} about the ${booking.event_type} event.`;
        link_to = user.id === booking.user_id ? '/talent-dashboard' : '/booker-dashboard';

      } else if (channelInfo.type === 'event_request') {
        const { data: eventRequest } = await supabase.from('event_requests').select('user_id, booker_name, event_type').eq('id', channelInfo.id).single();
        if (!eventRequest) return;
        
        const bookerId = eventRequest.user_id;
        const { data: adminUser } = await supabase.from('profiles').select('id').eq('email', 'admin@qtalent.live').single();
        
        recipientId = isAdmin ? bookerId : adminUser?.id;
        const senderName = isAdmin ? "QTalent Team" : eventRequest.booker_name;
        notificationMessage = `New message from ${senderName} regarding your ${eventRequest.event_type} request.`;
        link_to = isAdmin ? '/booker-dashboard' : '/admin/bookings';
      }

      if (!recipientId) return;

      await supabase.from('notifications').insert({
        user_id: recipientId,
        message: notificationMessage,
        booking_id: channelInfo.type === 'booking' ? channelInfo.id : null,
        event_request_id: channelInfo.type === 'event_request' ? channelInfo.id : null,
        link_to: link_to,
        type: 'new_message'
      });

    } catch (error) {
      console.error('Failed to create notification:', error);
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