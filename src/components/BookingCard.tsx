// FILE: src/components/BookingCard.tsx

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Check, X, Clock3, MessageCircle, Crown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/contexts/ChatContext";
import { useTalentBookingLimit } from "@/hooks/useTalentBookingLimit";
import { ProFeatureWrapper } from "@/components/ProFeatureWrapper";
import { useNavigate } from "react-router-dom";

export interface Booking {
  id: string;
  booker_name: string;
  booker_email?: string;
  booker_phone?: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_address: string;
  description?: string;
  status: string;
  user_id: string;
  talent_id?: string;
  talent_profiles?: { artist_name: string };
  event_type: string;
}

interface BookingCardProps {
  booking: Booking;
  mode: 'talent' | 'booker' | 'admin';
  onUpdate?: () => void;
  onRemove?: (bookingId: string) => void;
}

export const BookingCard = ({ booking, mode, onUpdate, onRemove }: BookingCardProps) => {
  const { toast } = useToast();
  const { openChat } = useChat();
  const { canAcceptBooking, isProUser, acceptedBookingsThisMonth, refetchLimit } = useTalentBookingLimit();
  const navigate = useNavigate();

  // Safety check
  if (!booking) {
    return null;
  }

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id);
      if (error) throw new Error(error.message);
      toast({ title: `Booking ${newStatus}` });
      
      // Refresh booking limit for talents after accepting a booking
      if (newStatus === 'accepted' && mode === 'talent') {
        refetchLimit();
      }
      
      onUpdate?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDecline = async () => {
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
      if (error) throw new Error(error.message);
      toast({ title: "Booking declined and removed" });
      onRemove?.(booking.id);
      onUpdate?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemove = async () => {
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
      if (error) throw new Error(error.message);
      toast({ title: "Booking removed" });
      onRemove?.(booking.id);
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
    <div className={`border rounded-lg p-4 bg-card text-card-foreground space-y-3 transition-all hover:shadow-md ${
      mode === 'talent' && !canAcceptBooking && !isProUser ? 'blur-sm opacity-60' : ''
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
            <h3 className="font-semibold capitalize text-foreground">Event Type: {booking.event_type}</h3>
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
      
      <div className="border-t pt-3 space-y-2">
        <div className="text-sm text-foreground">
          {mode === 'talent' ? (
            <><strong>Booker Name:</strong> <span className="text-muted-foreground">{booking.booker_name}</span></>
          ) : (
            <><strong>Talent:</strong> <span className="text-muted-foreground">{booking.talent_profiles?.artist_name || 'N/A'}</span></>
          )}
        </div>
        
        {booking.booker_email && mode !== 'booker' && (
          <div className="text-sm text-foreground">
            <strong>Booker Email:</strong> 
            {mode === 'talent' && !canAcceptBooking && !isProUser ? (
              <span className="text-muted-foreground blur-sm">••••••@••••.com</span>
            ) : (
              <span className="text-muted-foreground">{booking.booker_email}</span>
            )}
          </div>
        )}
        
        {booking.booker_phone && mode !== 'booker' && (
          <div className="text-sm text-foreground">
            <strong>Booker Phone:</strong> 
            {mode === 'talent' && !canAcceptBooking && !isProUser ? (
              <span className="text-muted-foreground blur-sm">+•• ••• ••• •••</span>
            ) : (
              <span className="text-muted-foreground">{booking.booker_phone}</span>
            )}
          </div>
        )}
        
        {mode === 'talent' && !canAcceptBooking && !isProUser && (booking.booker_email || booking.booker_phone) && (
          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              Upgrade to Pro to see booker contact details
            </p>
          </div>
        )}
        
        <div className="text-sm text-foreground">
          <strong>Event Location:</strong> <span className="text-muted-foreground">{booking.event_location}</span>
        </div>
        
        {booking.event_address && (
          <div className="text-sm text-foreground">
            <strong>Event Address:</strong> <span className="text-muted-foreground">{booking.event_address}</span>
          </div>
        )}
        
        {booking.description && (
          <div className="text-sm text-foreground">
            <strong>Event Description:</strong> <span className="text-muted-foreground">{booking.description}</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
        <Button onClick={() => openChat(booking.id, 'booking')} variant="outline" size="sm">
          <MessageCircle className="h-4 w-4 mr-2" />Chat
        </Button>
        
        {mode === 'talent' && booking.status === 'pending' && (
          <div className="flex-grow flex justify-end gap-2">
            <Button onClick={handleDecline} variant="destructive" size="sm">
              <X className="h-4 w-4 mr-2" />Decline
            </Button>
            {canAcceptBooking || isProUser ? (
              <Button onClick={() => handleUpdateStatus('accepted')} size="sm">
                <Check className="h-4 w-4 mr-2" />Accept
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/pricing')} 
                size="sm" 
                className="relative bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white border-amber-300"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro to Accept
              </Button>
            )}
          </div>
        )}
        
        {mode === 'booker' && booking.status === 'pending' && (
          <div className="flex-grow flex justify-end">
            <Button onClick={handleRemove} variant="destructive" size="sm">
              <X className="h-4 w-4 mr-2" />Remove Request
            </Button>
          </div>
        )}
        
        {mode === 'admin' && (
          <div className="flex-grow flex justify-end">
            <Button onClick={handleRemove} variant="destructive" size="sm">
              <X className="h-4 w-4 mr-2" />Delete
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