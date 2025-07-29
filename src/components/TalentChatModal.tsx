import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { User, Send, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  sender_type: 'talent' | 'booker';
  created_at: string;
  user_id: string;
  is_read: boolean;
}

interface TalentChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookerName: string;
  bookerEmail: string;
  bookingId: string;
  eventType: string;
}

interface BookingData {
  id: string;
  status: string;
  event_type: string;
  event_date: string;
  event_location: string;
  talent_profiles?: {
    artist_name: string;
    is_pro_subscriber: boolean;
  };
}

export function TalentChatModal({ 
  isOpen, 
  onClose, 
  bookerName, 
  bookerEmail, 
  bookingId,
  eventType 
}: TalentChatModalProps) {
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingBooking, setUpdatingBooking] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && bookingId) {
      loadBookingDetails();
      initializeConversation();
    }
  }, [isOpen, bookingId]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [conversationId]);

  const loadBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          talent_profiles (
            artist_name,
            is_pro_subscriber
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error) {
      console.error('Error loading booking details:', error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
    }
  };

  const initializeConversation = async () => {
    try {
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('booking_id', bookingId)
        .single();

      if (existingConversation) {
        setConversationId(existingConversation.id);
      } else {
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert({ booking_id: bookingId })
          .select('id')
          .single();

        if (error) throw error;
        setConversationId(newConversation.id);
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);

      // Mark messages as read
      if (user) {
        await supabase.rpc('mark_conversation_messages_read', {
          conversation_id_param: conversationId,
          user_id_param: user.id
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!conversationId) return;

    const subscription = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: newMessage.trim(),
          sender_type: 'talent',
          user_id: user.id,
          booking_id: bookingId
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (newStatus: 'approved' | 'declined') => {
    setUpdatingBooking(true);
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      setBooking(prev => prev ? { ...prev, status: newStatus } : null);

      toast({
        title: "Success",
        description: `Booking ${newStatus} successfully!`,
      });
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: `Failed to ${newStatus === 'approved' ? 'approve' : 'decline'} booking`,
        variant: "destructive",
      });
    } finally {
      setUpdatingBooking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/20';
      case 'approved':
        return 'bg-green-500/20 text-green-700 border-green-500/20';
      case 'declined':
        return 'bg-red-500/20 text-red-700 border-red-500/20';
      default:
        return 'bg-muted';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Chat with {bookerName}
          </DialogTitle>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{bookerEmail}</p>
            {booking && (
              <Badge className={getStatusColor(booking.status)}>
                {booking.status}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Booking Action Buttons - Only show for pending bookings */}
        {booking && booking.status === 'pending' && (
          <div className="border-b pb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
              <p className="text-amber-800 text-sm">
                💡 <strong>Tip:</strong> Make sure to discuss and agree on the price with the booker via chat before sending the invoice.
              </p>
            </div>
           <div className="flex gap-2">
            <Button
              onClick={() => updateBookingStatus('approved')}
              disabled={updatingBooking}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs flex-1"
            >
              <Check className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              onClick={() => updateBookingStatus('declined')}
              disabled={updatingBooking}
              variant="destructive"
              size="sm"
              className="h-8 px-3 text-xs flex-1"
            >
              <X className="h-3 w-3 mr-1" />
              Decline
            </Button>
          </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_type === 'talent' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.sender_type === 'talent'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {format(new Date(message.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <Button 
            onClick={sendMessage} 
            disabled={loading || !newMessage.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}