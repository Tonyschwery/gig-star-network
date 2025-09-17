// FILE: src/contexts/ChatContext.tsx

import React, 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ... (Interfaces remain the same)

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  // ... (State variables remain the same)

  // ... (openChat, closeChat, and fetchMessages functions remain the same)

  const sendMessage = async (content: string) => {
    if (!user || !channelInfo || !content.trim()) return;

    // --- Part A: Insert the message (this is working correctly) ---
    const messageData: any = { sender_id: user.id, content: content.trim() };
    if (channelInfo.type === 'booking') {
      messageData.booking_id = channelInfo.id;
    } else {
      messageData.event_request_id = channelInfo.id;
    }

    const { data: newMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      console.error('Error sending message:', messageError);
      return; // Stop if the message failed to send
    }

    // --- Part B: NEW - Create the notification directly ---
    try {
      let recipientId: string | undefined;
      let notificationMessage = '';
      let link_to = '';

      if (channelInfo.type === 'booking') {
        const { data: booking } = await supabase.from('bookings').select('user_id, talent_id, event_type, talent_profiles(artist_name)').eq('id', channelInfo.id).single();
        if (!booking) return;

        recipientId = user.id === booking.user_id ? booking.talent_id : booking.user_id;
        const senderName = user.id === booking.user_id ? "The Booker" : booking.talent_profiles?.artist_name;
        notificationMessage = `New message from ${senderName} about the ${booking.event_type} event.`;
        link_to = user.id === booking.user_id ? '/talent-dashboard' : '/booker-dashboard';
      } 
      else if (channelInfo.type === 'event_request') {
        const { data: eventRequest } = await supabase.from('event_requests').select('user_id, booker_name, event_type').eq('id', channelInfo.id).single();
        if (!eventRequest) return;
        
        // This logic assumes the chat is between the booker and the admin
        const bookerId = eventRequest.user_id;
        const isAdmin = user.email === 'admin@qtalent.live';
        
        // Find the admin user to get their ID for the notification
        const { data: adminUser } = await supabase.from('profiles').select('id').eq('email', 'admin@qtalent.live').single();
        if (!adminUser && !isAdmin) return; // Can't notify admin if not found

        recipientId = isAdmin ? bookerId : adminUser?.id;
        const senderName = isAdmin ? "QTalent Team" : eventRequest.booker_name;
        notificationMessage = `New message from ${senderName} regarding your ${eventRequest.event_type} request.`;
        link_to = isAdmin ? '/booker-dashboard' : '/admin/bookings';
      }

      if (!recipientId) return;

      // Insert the notification directly into the database
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

export const useChat = () => {
  // ... (This function is unchanged)
};