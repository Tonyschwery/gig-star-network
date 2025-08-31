// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, Check, X, Clock3, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";


export interface Booking {
  id: string;
  booker_name: string;
  booker_email: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_address: string;
  status: string;
  user_id: string;
  talent_id?: string;
  is_gig_opportunity?: boolean;
  talent_profiles?: { artist_name: string };
  event_type: string;
  created_at?: string | Date;
}

interface BookingCardProps {
  booking: Booking;
  mode: 'talent' | 'booker';
  onUpdate?: () => void;
  isProSubscriber?: boolean;
}

export const BookingCard = ({ booking, mode, onUpdate, isProSubscriber }: BookingCardProps) => {
  const navigate = useNavigate();

  const safeFormatDate = (date: any, dateFormat: string) => {
    try { return format(new Date(date), dateFormat); } catch { return "Invalid Date"; }
  };

  const handleAccept = async () => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'accepted' })
        .eq('id', booking.id);
      
      if (error) {
        console.error('Error accepting booking:', error);
        return;
      }
      
      onUpdate?.();
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  };

  const handleDecline = async () => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'declined' })
        .eq('id', booking.id);
      
      if (error) {
        console.error('Error declining booking:', error);
        return;
      }
      
      onUpdate?.();
    } catch (error) {
      console.error('Error declining booking:', error);
    }
  };

  const handleConfirm = async () => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);
      
      if (error) {
        console.error('Error confirming booking:', error);
        return;
      }
      
      onUpdate?.();
    } catch (error) {
      console.error('Error confirming booking:', error);
    }
  };


  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold capitalize">{booking.event_type} {booking.is_gig_opportunity ? 'Gig' : ''}</h3>
        <Badge>{booking.status.replace('_', ' ')}</Badge>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {/* Show different information based on mode and Pro status */}
        {mode === 'talent' ? (
          <>
            <div><strong>Booker:</strong> {booking.booker_name}</div>
            {/* Only show email if user is Pro subscriber in talent mode */}
            {isProSubscriber && (
              <div><strong>Email:</strong> {booking.booker_email}</div>
            )}
            <div><Calendar className="inline h-4 w-4 mr-2" />{safeFormatDate(booking.event_date, 'PPP')}</div>
            <div><Clock3 className="inline h-4 w-4 mr-2" />Duration: {booking.event_duration} hours</div>
            {/* Only show location details if Pro subscriber */}
            {isProSubscriber ? (
              <>
                <div><MapPin className="inline h-4 w-4 mr-2" />{booking.event_location}</div>
                {booking.event_address && <div><strong>Address:</strong> {booking.event_address}</div>}
              </>
            ) : (
              <div><MapPin className="inline h-4 w-4 mr-2" />Location: Hidden (Pro Feature)</div>
            )}
          </>
        ) : (
          <>
            <div><strong>Talent:</strong> {booking.talent_profiles?.artist_name || 'N/A'}</div>
            <div><Calendar className="inline h-4 w-4 mr-2" />{safeFormatDate(booking.event_date, 'PPP')}</div>
            <div><Clock3 className="inline h-4 w-4 mr-2" />Duration: {booking.event_duration} hours</div>
            <div><MapPin className="inline h-4 w-4 mr-2" />{booking.event_location}</div>
          </>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
        {mode === 'booker' && booking.talent_id && (
          <Button onClick={() => navigate(`/talent/${booking.talent_id}`)} variant="outline" size="sm">
            <User className="h-4 w-4 mr-2" />View Talent
          </Button>
        )}
        
        {/* Booker confirmation button */}
        {mode === 'booker' && booking.status === 'accepted' && (
          <Button onClick={handleConfirm} size="sm">
            <Check className="h-4 w-4 mr-2" />Confirm Booking
          </Button>
        )}
        
        {/* Talent accept/decline buttons */}
        {mode === 'talent' && booking.status === 'pending' && (
          <>
            <Button onClick={handleDecline} variant="outline" size="sm" className="border-red-200 text-red-600">
              <X className="h-4 w-4 mr-2" />Decline
            </Button>
            <Button onClick={handleAccept} size="sm">
              <Check className="h-4 w-4 mr-2" />Accept
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
