import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, User, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { filterSensitiveContent } from "@/lib/messageFilter";
import { PaymentModal } from "./PaymentModal";
import { ManualInvoiceModal } from "./ManualInvoiceModal";

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

interface Booking {
  id: string;
  status: string;
  event_type: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  talent_profiles?: {
    artist_name: string;
    rate_per_hour: number;
    is_pro_subscriber: boolean;
  };
}

export function ChatModal({ isOpen, onClose, bookerName, bookerEmail, eventType, bookingId }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [updatingBooking, setUpdatingBooking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManualInvoiceModal, setShowManualInvoiceModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load existing messages and booking details when modal opens
  useEffect(() => {
    if (isOpen && bookingId) {
      loadMessages();
      loadBookingDetails();
      
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

  const loadBookingDetails = async () => {
    try {
      // First try to get booking with talent profile joined
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          talent_profiles (
            artist_name,
            rate_per_hour,
            is_pro_subscriber
          )
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.talent_profiles) {
        // We have both booking and talent data
        setBooking(data);
      } else if (data && data.talent_id) {
        // We have booking but talent profile didn't join properly, get it separately
        const { data: talentData, error: talentError } = await supabase
          .from('talent_profiles')
          .select('artist_name, rate_per_hour, is_pro_subscriber')
          .eq('id', data.talent_id)
          .single();
        
        if (talentError) throw talentError;
        
        setBooking({
          ...data,
          talent_profiles: talentData
        });
      } else if (data) {
        // Booking exists but no talent assigned yet (shouldn't happen after claiming)
        setBooking(data);
      }
    } catch (error) {
      console.error('Error loading booking details:', error);
      // Try basic booking load as fallback
      try {
        const { data: basicData, error: basicError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (basicError) throw basicError;
        setBooking(basicData);
      } catch (fallbackError) {
        console.error('Error loading basic booking details:', fallbackError);
      }
    }
  };

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

  const updateBookingStatus = async (newStatus: 'approved' | 'declined') => {
    setUpdatingBooking(true);
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      // Update local booking state
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

  const isMyMessage = (message: Message) => {
    return user && message.sender_id === user.id;
  };

  return (
    <>
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
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    // Check if talent has a rate, if not use manual invoice
                    const hasRate = booking?.talent_profiles?.rate_per_hour && booking?.talent_profiles?.rate_per_hour > 0;
                    if (hasRate) {
                      setShowPaymentModal(true);
                    } else {
                      setShowManualInvoiceModal(true);
                    }
                  }}
                  disabled={updatingBooking}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs flex-1"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Approve & Send Invoice
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

    {/* Payment Modal */}
    {booking && (
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        booking={booking}
        onPaymentSuccess={() => {
          updateBookingStatus('approved');
          setShowPaymentModal(false);
        }}
        userType="talent"
      />
    )}

    {/* Manual Invoice Modal */}
    {booking && (
      <ManualInvoiceModal
        isOpen={showManualInvoiceModal}
        onClose={() => setShowManualInvoiceModal(false)}
        booking={booking}
        onInvoiceSuccess={() => {
          updateBookingStatus('approved');
          setShowManualInvoiceModal(false);
        }}
      />
    )}
    </>
  );
}