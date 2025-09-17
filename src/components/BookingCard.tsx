// FILE: src/components/BookingCard.tsx

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Check, X, Clock3, MessageCircle } from "lucide-react";
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
}

interface BookingCardProps {
  booking: Booking;
  mode: 'talent' | 'booker';
  onUpdate?: () => void;
}

export const BookingCard = ({ booking, mode, onUpdate }: BookingCardProps) => {
  const { toast } = useToast();
  const { openChat } = useChat();

  // Safety check
  if (!booking) {
    return null;
  }

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id);
      if (error) throw new Error(error.message);
      toast({ title: `Booking ${newStatus}` });
      onUpdate?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'confirmed': return 'default'; // Using default for success (often blue or black)
      case 'accepted': return 'secondary';
      case 'pending': return 'secondary';
      case 'cancelled':
      case 'declined':
        return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card text-card-foreground space-y-3 transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
            <h3 className="font-semibold capitalize text-foreground">{booking.event_type}</h3>
            <div className="text-sm text-muted-foreground flex items-center">
              <Calendar className="inline h-4 w-4 mr-2" />
              {booking.event_date ? format(new Date(booking.event_date), 'PPP') : 'No date'}
            </div>
            <div className="text-sm text-muted-foreground flex items-center">
              <Clock3 className="inline h-4 w-4 mr-2" />
              {booking.event_duration} hours
            </div>
        </div>
        <Badge variant={getStatusBadgeVariant(booking.status)} className="capitalize">{booking.status}</Badge>
      </div>
      
      <div className="border-t pt-3">
        <div className="text-sm text-foreground">
          {mode === 'talent' ? (
            <><strong>Booker:</strong> <span className="text-muted-foreground">{booking.booker_name}</span></>
          ) : (
            <><strong>Talent:</strong> <span className="text-muted-foreground">{booking.talent_profiles?.artist_name || 'N/A'}</span></>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
        <Button onClick={() => openChat(booking.id, 'booking')} variant="outline" size="sm">
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

        {(booking.status === 'accepted' || booking.status === 'confirmed') && (
            <Button onClick={() => handleUpdateStatus('cancelled')} variant="ghost" size="sm" className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90">
                <X className="h-4 w-4 mr-2" />Cancel Booking
            </Button>
        )}
      </div>
    </div>
  );
}