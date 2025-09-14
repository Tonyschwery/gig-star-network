import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Check, X, Clock3, MapPin, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/contexts/ChatContext"; // Import the new useChat hook
//gemini14
export interface Booking {
  id: string;
  booker_name: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  status: string;
  user_id: string;
  talent_id?: string;
  talent_profiles?: { artist_name: string };
  event_type: string;
  // Add other fields as needed
}

interface BookingCardProps {
  booking: Booking;
  mode: 'talent' | 'booker';
  onUpdate?: () => void;
  isProSubscriber?: boolean;
  canAccept?: boolean;
  onChatOpen?: (bookingId: string) => void;
}

export const BookingCard = ({ booking, mode, onUpdate }: BookingCardProps) => {
  const { toast } = useToast();
  const { openChat } = useChat(); // Get the openChat function from our new "brain"

  const handleUpdateStatus = async (newStatus: 'accepted' | 'declined') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', booking.id);

    if (error) {
      toast({ title: "Error", description: `Failed to update booking to ${newStatus}.`, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Booking has been ${newStatus}.` });
      onUpdate?.();
    }
  };
  
  const safeFormatDate = (date: any, dateFormat: string) => {
    try { return format(new Date(date), dateFormat); } catch { return "Invalid Date"; }
  };

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold capitalize">{booking.event_type}</h3>
        <Badge>{booking.status}</Badge>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
        {mode === 'talent' ? (
          <div><strong>Booker:</strong> {booking.booker_name}</div>
        ) : (
          <div><strong>Talent:</strong> {booking.talent_profiles?.artist_name || 'N/A'}</div>
        )}
        <div><Calendar className="inline h-4 w-4 mr-2" />{safeFormatDate(booking.event_date, 'PPP')}</div>
        <div><Clock3 className="inline h-4 w-4 mr-2" />{booking.event_duration} hours</div>
        <div><MapPin className="inline h-4 w-4 mr-2" />{booking.event_location}</div>
      </div>
      
      <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
        {/* The onClick handler now uses the simple, direct openChat function */}
        <Button onClick={() => openChat(booking.id)} variant="outline" size="sm">
          <MessageCircle className="h-4 w-4 mr-2" />Chat
        </Button>
        
        {mode === 'talent' && booking.status === 'pending' && (
          <>
            <Button onClick={() => handleUpdateStatus('declined')} variant="destructive" size="sm">
              <X className="h-4 w-4 mr-2" />Decline
            </Button>
            <Button onClick={() => handleUpdateStatus('accepted')} size="sm">
              <Check className="h-4 w-4 mr-2" />Accept
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

