// FILE: src/components/UniversalChat.tsx

import { useState, useEffect, useRef } from 'react';
import { useChat, Message } from '@/contexts/ChatContext';
import { useAuth } from '@/hooks/useAuth';
import { useTalentBookingLimit } from '@/hooks/useTalentBookingLimit';
import { useAdvancedChatFilter } from '@/hooks/useAdvancedChatFilter';
import { useRecipientTalentStatus } from '@/hooks/useRecipientTalentStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, User, Crown, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

export const UniversalChat = () => {
  const { isOpen, closeChat, messages, sendMessage, loadingMessages, channelInfo, setUserInteracting } = useChat();
  const { user } = useAuth();
  const { canReceiveBooking, isProUser, isTalent } = useTalentBookingLimit();
  const { isRecipientNonProTalent } = useRecipientTalentStatus(channelInfo, user?.id);
  const { filterMessage, updateConversationBuffer } = useAdvancedChatFilter(
    channelInfo, 
    user?.id, 
    isRecipientNonProTalent || isProUser // Pro users bypass filtering
  );
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showFilteredMessage, setShowFilteredMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingMessages]);

  // Update conversation buffer when messages change
  useEffect(() => {
    if (messages.length > 0) {
      updateConversationBuffer(messages);
    }
  }, [messages, updateConversationBuffer]);

  // Communicate interaction state to context
  useEffect(() => {
    setUserInteracting(isTyping || isHovering || isFocused);
  }, [isTyping, isHovering, isFocused, setUserInteracting]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && user?.id) {
      // Apply advanced filtering for non-pro talents (sender is talent)
      if (isTalent && !isProUser) {
        const filterResult = filterMessage(newMessage);
        if (filterResult.isBlocked) {
          setShowFilteredMessage(filterResult.reason || 'Message blocked');
          setNewMessage("");
          return;
        }
      }
      
      // Apply advanced filtering when bookers message non-pro talents (recipient is non-pro talent)
      if (!isTalent && isRecipientNonProTalent) {
        const filterResult = filterMessage(newMessage);
        if (filterResult.isBlocked) {
          const isAdvancedPattern = filterResult.riskScore && filterResult.riskScore >= 60;
          toast({
            title: "Contact Information Blocked",
            description: isAdvancedPattern
              ? "Advanced pattern detected - splitting contact info across messages is not allowed. The talent needs Pro to receive contact details."
              : "The talent you're messaging needs to upgrade to Pro to receive contact details. This helps our platform support talented artists!",
            variant: "default",
          });
          setShowFilteredMessage(
            isAdvancedPattern
              ? "⚠️ Multi-message contact sharing detected - Pro upgrade required"
              : "The talent needs Pro to receive contact details"
          );
          setNewMessage("");
          return;
        }
      }
      
      sendMessage(newMessage, user.id);
      setNewMessage('');
      setShowFilteredMessage(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-[calc(100%-2rem)] max-w-sm h-[60vh] sm:h-[70vh] z-50">
      <Card 
        className="w-full h-full flex flex-col shadow-2xl"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <CardTitle className="text-base font-semibold">
            {channelInfo?.type === 'booking' ? 'Booking Chat' : 'Event Request Chat'}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={closeChat}
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
            {/* Pro upgrade prompt for non-pro talents */}
            {isTalent && !isProUser && (
              <div className="mb-3 p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-2">
                  🚀 <strong>Unlock Pro Features:</strong> Share contact details, unlimited messaging, and earn 100% of your bookings! This is how our platform grows and supports amazing artists like you.
                </p>
                <Button 
                  size="sm" 
                  onClick={() => window.open('/pricing', '_blank')}
                  className="bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Upgrade to Pro - Start Earning More!
                </Button>
              </div>
            )}
            
            {/* Alert when bookers message non-pro talents */}
            {!isTalent && isRecipientNonProTalent && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  This talent is on our Free plan - they can't receive contact details yet. Encourage them to upgrade to Pro!
                </p>
              </div>
            )}
            
            {/* Filtered message notification */}
            {showFilteredMessage && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                  {showFilteredMessage}
                </p>
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
                  
                  // Set new timeout to clear typing state only if not focused
                  typingTimeoutRef.current = setTimeout(() => {
                    if (!isFocused) {
                      setIsTyping(false);
                    }
                  }, 5000); // Increased timeout to 5 seconds
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false);
                  // Clear typing after blur with delay
                  setTimeout(() => {
                    if (!isFocused) {
                      setIsTyping(false);
                    }
                  }, 1000);
                }}
                placeholder={
                  isTalent && !isProUser
                    ? "Upgrade to Pro to share contact details..."
                    : !isTalent && isRecipientNonProTalent
                    ? "This talent can't receive contact details (Free plan)..."
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