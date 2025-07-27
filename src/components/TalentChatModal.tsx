import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SimpleChat } from "./SimpleChat";
import { InvoiceModal } from "./InvoiceModal";

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
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [updatingBooking, setUpdatingBooking] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && bookingId) {
      loadBookingDetails();
    }
  }, [isOpen, bookingId]);

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
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                <p className="text-amber-800 text-sm">
                  💡 <strong>Tip:</strong> Make sure to discuss and agree on the price with the booker via chat before sending the invoice.
                </p>
              </div>
               <div className="flex gap-2">
                <Button
                  onClick={() => setShowInvoiceModal(true)}
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

          <div className="flex-1 min-h-0">
            <SimpleChat
              bookingId={bookingId}
              recipientName={bookerName}
              userType="talent"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Modal */}
      {booking && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          booking={booking}
          onSuccess={() => {
            loadBookingDetails();
            setShowInvoiceModal(false);
          }}
        />
      )}
    </>
  );
}