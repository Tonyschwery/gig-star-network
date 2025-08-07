// PASTE THIS ENTIRE CODE BLOCK INTO src/components/BookingCard.tsx

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, Check, X, MessageCircle, Clock3, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ManualInvoiceModal } from "./ManualInvoiceModal";

export interface Booking {
  id: string;
  booker_name: string;
  event_date: string | Date;
  event_duration: number;
  event_location: string;
  status: string;
  created_at: string | Date;
  user_id: string;
  talent_id?: string;
  is_gig_opportunity?: boolean;
  talent_profiles?: { artist_name: string; };
  payments?: { total_amount: number; currency: string }[];
}

interface BookingCardProps {
  booking: Booking;
  mode: 'talent' | 'booker';
  onUpdate?: () => void;
  isProSubscriber?: boolean;
  gigApplicationId?: string;
  onOpenChat: (bookingId: string, gigApplicationId?: string) => void;
}

export const BookingCard = ({ booking, mode, onUpdate, isProSubscriber, gigApplicationId, onOpenChat }: BookingCardProps) => {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  const safeFormatDate = (date: string | Date | null | undefined, dateFormat: string) => {
    try {
      if (!date) return "N/A";
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "Invalid Date";
      return format(dateObj, dateFormat);
    } catch (error) { return "Invalid Date"; }
  };

  const handleAccept = () => setShowInvoiceModal(true);

  const handleDecline = async () => {
    const table = gigApplicationId ? 'gig_applications' : 'bookings';
    const id = gigApplicationId || booking.id;
    const { error } = await supabase.from(table).update({ status: 'declined' }).eq('id', id);
    if (!error) onUpdate?.();
  };
  
  const paymentAmount = booking.payments?.[0]?.total_amount;
  const paymentCurrency = booking.payments?.[0]?.currency || 'USD';

  return (
    <>
      <div className="border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold capitalize">{booking.event_type} {booking.is_gig_opportunity ? 'Gig' : ''}</h3>
            <Badge>{booking.status.replace('_', ' ')}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><strong>{mode === 'talent' ? 'Booker:' : 'Talent:'}</strong> {mode === 'talent' ? booking.booker_name : booking.talent_profiles?.artist_name || 'N/A'}</div>
            <div><Calendar className="inline h-4 w-4 mr-2" />{safeFormatDate(booking.event_date, 'PPP')}</div>
            <div><Clock3 className="inline h-4 w-4 mr-2" />Duration: {booking.event_duration} hours</div>
            <div><MapPin className="inline h-4 w-4 mr-2" />{booking.event_location}</div>
        </div>

        {paymentAmount && <div className="font-semibold text-green-600">Amount Paid: ${paymentAmount} {paymentCurrency}</div>}

        <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
            <Button onClick={() => onOpenChat(booking.id, gigApplicationId)} variant="outline" size="sm"><MessageCircle className="h-4 w-4 mr-2" />Chat</Button>
            {mode === 'booker' && booking.talent_id && <Button onClick={() => useNavigate()(`/talent/${booking.talent_id}`)} variant="outline" size="sm"><User className="h-4 w-4 mr-2" />View Talent</Button>}
            {mode === 'talent' && booking.status === 'pending' && (
                <>
                    <Button onClick={handleDecline} variant="outline" size="sm" className="border-red-200 text-red-600"><X className="h-4 w-4 mr-2" />Decline</Button>
                    <Button onClick={handleAccept} size="sm"><Check className="h-4 w-4 mr-2" />Accept & Send Invoice</Button>
                </>
            )}
        </div>
      </div>

      <ManualInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        booking={booking}
        isProSubscriber={isProSubscriber}
        onSuccess={() => { setShowInvoiceModal(false); onUpdate?.(); }}
        gigApplicationId={gigApplicationId}
      />
    </>
  );
}