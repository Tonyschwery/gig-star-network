import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Crown, Lock } from "lucide-react";
import { format } from "date-fns";
import { ProFeatureWrapper } from "./ProFeatureWrapper";
import { useAuth } from "@/hooks/useAuth";
import { filterSensitiveContent } from "@/lib/messageFilter";
import { ChatInput } from "./ChatInput";

interface Message {
  id: string;
  sender_id: string;
  sender_type: 'talent' | 'booker';
  message: string;
  created_at: string;
}

interface BookingChatProps {
  bookingId: string;
  bookerName: string;
  isProSubscriber?: boolean;
  onUpgrade?: () => void;
  isDirectBooking?: boolean; // New prop to indicate if this is a direct booking from a booker
}

const BookingChatComponent = ({ bookingId, bookerName, isProSubscriber = false, onUpgrade, isDirectBooking = false }: BookingChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debug: Track component re-renders
  console.log('🔄 BookingChat component rendered:', {
    bookingId,
    bookerName,
    isProSubscriber,
    timestamp: new Date().toISOString()
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Allow chat for pro subscribers OR direct bookings from bookers
    if (isProSubscriber || isDirectBooking) {
      fetchMessages();
      
      // Set up real-time subscription for new messages
      const channel = supabase
        .channel(`booking-chat-${bookingId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'booking_messages',
            filter: `booking_id=eq.${bookingId}`
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
    }
  }, [bookingId, isProSubscriber, isDirectBooking]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = useCallback(async (message: string) => {
    if (!user || !message.trim()) return;

    // Filter sensitive content from the message
    const filteredMessage = filterSensitiveContent(message.trim());
    
    if (!filteredMessage) {
      toast({
        title: "Message blocked",
        description: "Your message contained sensitive information and was not sent.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Prepare message data with proper validation - ensure all fields are clean strings
      const messageData = {
        booking_id: String(bookingId).trim(),
        sender_id: String(user.id).trim(),
        sender_type: 'talent',
        message: String(filteredMessage).trim()
      };

      console.log('Sending message with clean data:', messageData);

      const { error } = await supabase
        .from('booking_messages')
        .insert([messageData]); // Wrap in array for consistency

      if (error) {
        console.error('Database error sending message:', error);
        throw error;
      }

      console.log('Message sent successfully');
      
      // Show a toast if the message was filtered
      if (filteredMessage !== message.trim()) {
        toast({
          title: "Message filtered",
          description: "Some sensitive information was removed from your message for security.",
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [user, bookingId, toast]);

  const ChatContent = () => (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" />
          Chat with {bookerName}
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
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'talent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[80%] ${message.sender_type === 'talent' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {message.sender_type === 'talent' ? 'T' : 'B'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`rounded-lg p-2 ${
                      message.sender_type === 'talent' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(message.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={sending}
          placeholder="Type your message..."
        />
      </CardContent>
    </Card>
  );

  // For non-pro subscribers who don't have a direct booking, show a restricted version
  if (!isProSubscriber && !isDirectBooking) {
    return (
      <div className="relative">
        <ProFeatureWrapper isProFeature={true} showProIcon={false}>
          <ChatContent />
        </ProFeatureWrapper>
        
        {/* Overlay with upgrade prompt */}
        <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
          <div className="text-center space-y-3 p-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Lock className="h-5 w-5" />
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Chat Feature (Pro Only)</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Communicate directly with bookers before accepting requests
              </p>
              <Button
                onClick={onUpgrade}
                size="sm"
                className="hero-button"
              >
                <Crown className="h-3 w-3 mr-1" />
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatContent />;
}

export const BookingChat = memo(BookingChatComponent);