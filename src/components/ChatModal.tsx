import { useState, useEffect, useRef } from "react";
import { Send, X, Phone, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  content: string;
  sender_type: 'talent' | 'booker';
  user_id: string;
  created_at: string;
}

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  talentName?: string;
  talentImageUrl?: string;
  eventType?: string;
  eventDate?: string;
}

export function ChatModal({ 
  open, 
  onOpenChange, 
  bookingId, 
  talentName = "Talent",
  talentImageUrl,
  eventType,
  eventDate 
}: ChatModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [senderType, setSenderType] = useState<'talent' | 'booker'>('booker');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open && bookingId && user) {
      fetchConversation();
      determineSenderType();
    }
  }, [open, bookingId, user]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (open && conversationId && user) {
      markMessagesAsRead();
    }
  }, [open, conversationId, user]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversationId || !open) return;

    console.log('Setting up real-time subscription for conversation:', conversationId);
    
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Real-time message received:', payload);
          const newMessage = payload.new as Message;
          setMessages(prev => {
            // Avoid duplicate messages
            if (prev.find(msg => msg.id === newMessage.id)) {
              console.log('Duplicate message ignored:', newMessage.id);
              return prev;
            }
            console.log('Adding new message to state:', newMessage);
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [conversationId, open]);

  const determineSenderType = async () => {
    try {
      const { data: booking } = await supabase
        .from('bookings')
        .select('user_id, talent_id, talent_profiles(user_id)')
        .eq('id', bookingId)
        .single();

      if (booking) {
        if (booking.user_id === user?.id) {
          setSenderType('booker');
        } else if (booking.talent_profiles?.user_id === user?.id) {
          setSenderType('talent');
        }
      }
    } catch (error) {
      console.error('Error determining sender type:', error);
    }
  };

  const fetchConversation = async () => {
    try {
      setIsLoading(true);

      // Get or create conversation
      let { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (!conversation) {
        console.log('Creating new conversation for booking:', bookingId);
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({ booking_id: bookingId })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          throw createError;
        }
        conversation = newConversation;
        console.log('Created conversation:', conversation);
      }

      setConversationId(conversation.id);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages((messagesData || []) as Message[]);

    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast({
        title: "Error loading chat",
        description: "Failed to load conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!conversationId || !user) return;

    try {
      await supabase.rpc('mark_conversation_messages_read', {
        conversation_id_param: conversationId,
        user_id_param: user.id
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user || isSending) return;

    try {
      setIsSending(true);
      const messageContent = newMessage.trim();
      
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: messageContent,
          sender_type: senderType,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, message as Message]);
      setNewMessage("");
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error sending message",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isCurrentUserMessage = (message: Message) => {
    return message.user_id === user?.id;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={talentImageUrl} alt={talentName} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {talentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg font-semibold">{talentName}</DialogTitle>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  {eventType && <Badge variant="outline">{eventType}</Badge>}
                  {eventDate && <span>{new Date(eventDate).toLocaleDateString()}</span>}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading conversation...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-muted-foreground mb-2">No messages yet</div>
              <div className="text-sm text-muted-foreground">Start the conversation!</div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    isCurrentUserMessage(message) ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      isCurrentUserMessage(message)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isCurrentUserMessage(message)
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex space-x-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="min-h-[40px] max-h-[120px] resize-none"
              disabled={isSending}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              size="icon"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Messages are filtered for contact info</span>
            <div className="flex items-center space-x-2">
              <Phone className="h-3 w-3" />
              <span>Contact details shared after booking confirmation</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}