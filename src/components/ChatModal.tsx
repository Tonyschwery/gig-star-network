import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { filterSensitiveContent } from "@/lib/messageFilter";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookerName: string;
  bookerEmail: string;
  eventType: string;
  bookingId: string;
}

interface Message {
  id: string;
  message: string;
  sender_type: string;
  sender_id: string;
  created_at: string;
}

export function ChatModal({ isOpen, onClose, bookerName, bookerEmail, eventType, bookingId }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load existing messages when modal opens
  useEffect(() => {
    if (isOpen && bookingId) {
      loadMessages();
      
      // Set up real-time subscription for new messages
      const channel = supabase
        .channel('booking-messages')
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
  }, [isOpen, bookingId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load chat messages.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || loading) return;

    // Filter sensitive content from the message
    const filteredMessage = filterSensitiveContent(newMessage.trim());
    
    if (!filteredMessage) {
      toast({
        title: "Message blocked",
        description: "Your message contained sensitive information and was not sent.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('booking_messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          sender_type: 'talent', // Since this is from gigs page, sender is always talent
          message: filteredMessage
        });

      if (error) throw error;

      setNewMessage("");
      
      // Show success message
      toast({
        title: "Message Sent",
        description: `Your message has been sent to ${bookerName}.`,
      });
      
      // Show filter message if content was filtered
      if (filteredMessage !== newMessage.trim()) {
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
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isMyMessage = (message: Message) => {
    return user && message.sender_id === user.id;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Chat with {bookerName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{bookerEmail}</p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4">{}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    isMyMessage(message)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p>{message.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[60px] resize-none"
            autoComplete="off"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || loading}
            size="icon"
            className="h-[60px] w-12"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}