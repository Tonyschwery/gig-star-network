import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  is_filtered: boolean;
  original_content: string;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  booker_id: string;
  talent_id: string;
  booking_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

interface SimpleChatProps {
  bookingId: string;
  recipientName: string;
  userType: 'talent' | 'booker';
  disabled?: boolean;
  disabledMessage?: string;
}

export function SimpleChat({ 
  bookingId, 
  recipientName, 
  userType, 
  disabled = false,
  disabledMessage = "Chat is not available"
}: SimpleChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!disabled && user && bookingId) {
      initializeChat();
    } else {
      setLoading(false);
    }
  }, [bookingId, disabled, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      // Get booking details to find talent_id and booker_id
      const { data: booking } = await supabase
        .from('bookings')
        .select('talent_id, user_id')
        .eq('id', bookingId)
        .single();

      if (!booking) {
        console.error('Booking not found');
        setLoading(false);
        return;
      }

      const talentId = booking.talent_id;
      const bookerId = booking.user_id;

      // Find or create conversation
      let conversationData;
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('talent_id', talentId)
        .eq('booker_id', bookerId)
        .single();

      if (existingConv) {
        conversationData = existingConv;
      } else {
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            booker_id: bookerId,
            talent_id: talentId,
            booking_id: bookingId
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          throw createError;
        }
        conversationData = newConv;
      }

      setConversation(conversationData);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationData.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }
      
      setMessages(messagesData || []);

      // Setup realtime subscription
      setupRealtimeSubscription(conversationData.id);

    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: "Error",
        description: "Failed to load chat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = (conversationId: string) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending || !conversation) return;

    setSending(true);
    try {
      // Determine sender type based on user role
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const senderType = talentProfile ? 'talent' : 'booker';

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_type: senderType,
          content: newMessage.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (disabled) {
    return (
      <Card className="glass-card opacity-60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" />
            Chat with {recipientName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{disabledMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" />
          Chat with {recipientName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-64 w-full border rounded-lg p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div>
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                const showFilterWarning = message.is_filtered;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-2 max-w-[80%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {message.sender_type === 'talent' ? 'T' : 'B'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`rounded-lg p-2 ${
                        isOwnMessage 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                        {showFilterWarning && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-1 text-xs text-yellow-600">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Content was filtered for security</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="min-h-[40px] resize-none"
            autoComplete="off"
          />
          <Button 
            onClick={sendMessage} 
            disabled={sending || !newMessage.trim()}
            size="sm"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}