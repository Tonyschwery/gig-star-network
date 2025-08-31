// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, Check, X, Clock3, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";


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
  canAccept?: boolean;
}

export const BookingCard = ({ booking, mode, onUpdate, isProSubscriber, canAccept = true }: BookingCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const safeFormatDate = (date: any, dateFormat: string) => {
    try { return format(new Date(date), dateFormat); } catch { return "Invalid Date"; }
  };

  const handleAccept = async () => {
    if (!canAccept) {
      toast({
        title: "Booking Limit Reached",
        description: "Free talents can only accept 1 booking per month. Upgrade to Pro for unlimited bookings!",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log('Accepting booking:', booking.id, 'Current status:', booking.status);
      
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'accepted' })
        .eq('id', booking.id)
        .select();
      
      if (error) {
        console.error('Supabase error accepting booking:', error);
        toast({
          title: "Error",
          description: "Failed to accept booking. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Successfully accepted booking:', data);
      
      toast({
        title: "Booking Accepted",
        description: "You have successfully accepted this booking request!",
      });
      
      onUpdate?.();
    } catch (error) {
      console.error('Unexpected error accepting booking:', error);
      toast({
        title: "Error", 
        description: "Failed to accept booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async () => {
    try {
      console.log('Declining booking:', booking.id, 'Current status:', booking.status);
      
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'declined' })
        .eq('id', booking.id)
        .select();
      
      if (error) {
        console.error('Supabase error declining booking:', error);
        toast({
          title: "Error",
          description: "Failed to decline booking. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Successfully declined booking:', data);
      
      toast({
        title: "Booking Declined",
        description: "You have declined this booking request.",
      });
      
      onUpdate?.();
    } catch (error) {
      console.error('Unexpected error declining booking:', error);
      toast({
        title: "Error",
        description: "Failed to decline booking. Please try again.",
        variant: "destructive",
      });
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
            <Button 
              onClick={handleAccept} 
              size="sm"
              disabled={!canAccept}
              title={!canAccept ? "Booking limit reached - upgrade to Pro for unlimited bookings" : ""}
            >
              <Check className="h-4 w-4 mr-2" />
              {canAccept ? 'Accept' : 'Limit Reached'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
