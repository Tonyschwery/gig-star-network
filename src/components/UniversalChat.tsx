// FILE: src/components/UniversalChat.tsx

import { useState, useEffect, useRef } from 'react';
import { useChat, Message } from '@/contexts/ChatContext';
import { useAuth } from '@/hooks/useAuth';
import { useTalentBookingLimit } from '@/hooks/useTalentBookingLimit';
import { useChatFilterPro } from '@/hooks/useChatFilterPro';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, User, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const UniversalChat = () => {
  const { isOpen, closeChat, messages, sendMessage, loadingMessages, channelInfo } = useChat();
  const { user } = useAuth();
  const { canAcceptBooking, isProUser, isTalent } = useTalentBookingLimit();
  const { filterMessage } = useChatFilterPro(isProUser);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && user?.id) {
      // Check if user is a non-pro talent who has reached booking limit
      if (isTalent && !canAcceptBooking && !isProUser) {
        const filterResult = filterMessage(newMessage);
        if (filterResult.isBlocked) {
          // Show upgrade prompt instead of sending blocked message
          setNewMessage("");
          return;
        }
      }
      sendMessage(newMessage, user.id);
      setNewMessage('');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-[calc(100%-2rem)] max-w-sm h-[60vh] sm:h-[70vh] z-50">
      <Card className="w-full h-full flex flex-col shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <CardTitle className="text-base font-semibold">
            {channelInfo?.type === 'booking' ? 'Booking Chat' : 'Event Request Chat'}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={closeChat}
            disabled={isTyping}
            className={isTyping ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex items-end gap-2',
                    msg.sender_id === user?.id ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.sender_id !== user?.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-xs p-3 rounded-2xl text-sm',
                      msg.sender_id === user?.id
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted rounded-bl-none'
                    )}
                  >
                    <p>{msg.content}</p>
                    <p className={cn("text-xs mt-1", msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>
                      {format(new Date(msg.created_at), 'p')}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t bg-background">
            {isTalent && !canAcceptBooking && !isProUser && (
              <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-2">
                  You've reached your monthly booking limit. Upgrade to Pro for unlimited bookings and full messaging access.
                </p>
                <Button 
                  size="sm" 
                  onClick={() => window.open('/pricing', '_blank')}
                  className="bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Upgrade to Pro
                </Button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  
                  // Handle typing detection
                  setIsTyping(e.target.value.length > 0);
                  
                  // Clear previous timeout
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  
                  // Set new timeout to clear typing state
                  typingTimeoutRef.current = setTimeout(() => {
                    setIsTyping(false);
                  }, 1000);
                }}
                placeholder={
                  isTalent && !canAcceptBooking && !isProUser
                    ? "Upgrade to Pro to share contact details..."
                    : "Type your message..."
                }
                className="resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                onBlur={() => {
                  // Clear typing state when user leaves the input
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  setIsTyping(false);
                }}
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};