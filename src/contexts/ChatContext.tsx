import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ChatContextType {
  isChatOpen: boolean;
  activeBookingId: string | null;
  openChat: (bookingId: string) => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  const openChat = (bookingId: string) => {
    setActiveBookingId(bookingId);
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setActiveBookingId(null);
  };

  const value = { isChatOpen, activeBookingId, openChat, closeChat };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};