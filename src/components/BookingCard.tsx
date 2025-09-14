import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Check, X, Clock3, MapPin, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/contexts/ChatContext";

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
  is_pro_subscriber?: boolean;
}

interface BookingCardProps {
  booking: Booking;
  mode: 'talent' | 'booker';
  onUpdate?: () => void;
}

export const BookingCard = ({ booking, mode, onUpdate }: BookingCardProps) => {
  const { toast } = useToast();
  const { openChat } = useChat();

  const handleUpdateStatus = async (newStatus: 'accepted' | 'confirmed' | 'cancelled' | 'declined') => {
    // For our new logic, 'declined' and 'cancelled' do the same thing.
    const finalStatus = (newStatus === 'declined' || newStatus === 'cancelled') ? 'cancelled' : newStatus;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: finalStatus })
        .eq('id', booking.id);

      if (error) throw new Error(error.message);

      toast({ title: `Booking ${finalStatus.charAt(0).toUpperCase() + finalStatus.slice(1)}` });
      onUpdate?.();
    } catch (error) {
      toast({ title: "Error", description: `Failed to update booking.`, variant: "destructive" });
    }
  };

  const safeFormatDate = (date: any, dateFormat: string) => {
    try { return format(new Date(date), dateFormat); } catch { return "Invalid Date"; }
  };
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'pending': return 'secondary';
        case 'accepted': return 'default';
        case 'confirmed': return 'success';
        default: return 'outline';
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3 transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
            <h3 className="font-semibold capitalize">{booking.event_type}</h3>
            <div className="text-sm text-muted-foreground flex items-center">
              <Calendar className="inline h-4 w-4 mr-2" />
              {safeFormatDate(booking.event_date, 'PPP')}
            </div>
            <div className="text-sm text-muted-foreground flex items-center">
              <Clock3 className="inline h-4 w-4 mr-2" />
              {booking.event_duration} hours
            </div>
        </div>
        <Badge variant={getStatusBadgeVariant(booking.status)} className="capitalize">{booking.status}</Badge>
      </div>
      
      <div className="border-t pt-3">
        <div className="text-sm">
          {mode === 'talent' ? (
            <><strong>Booker:</strong> {booking.booker_name}</>
          ) : (
            <><strong>Talent:</strong> {booking.talent_profiles?.artist_name || 'N/A'}</>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
        <Button onClick={() => openChat(booking.id)} variant="outline" size="sm">
          <MessageCircle className="h-4 w-4 mr-2" />Chat
        </Button>
        
        {mode === 'talent' && booking.status === 'pending' && (
          <div className="flex-grow flex justify-end gap-2">
            <Button onClick={() => handleUpdateStatus('declined')} variant="destructive" size="sm">
              <X className="h-4 w-4 mr-2" />Decline
            </Button>
            <Button onClick={() => handleUpdateStatus('accepted')} size="sm">
              <Check className="h-4 w-4 mr-2" />Accept
            </Button>
          </div>
        )}
        
        {mode === 'booker' && booking.status === 'accepted' && (
          <div className="flex-grow flex justify-end">
            <Button onClick={() => handleUpdateStatus('confirmed')} size="sm">
              <Check className="h-4 w-4 mr-2" />Confirm Booking
            </Button>
          </div>
        )}

        {/* New Cancel button for both users on active bookings */}
        {(booking.status === 'accepted' || booking.status === 'confirmed') && (
            <Button onClick={() => handleUpdateStatus('cancelled')} variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <X className="h-4 w-4 mr-2" />Cancel Booking
            </Button>
        )}
      </div>
    </div>
  );
}