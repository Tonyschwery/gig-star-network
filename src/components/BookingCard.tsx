// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, Check, X, Clock3, MapPin, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ManualInvoiceModal } from "./ManualInvoiceModal";
import { ChatModal } from "./ChatModal";

export interface Payment {
  id: string;
  booking_id: string;
  booker_id: string;
  talent_id: string;
  total_amount: number;
  platform_commission: number;
  talent_earnings: number;
  commission_rate: number;
  hourly_rate: number;
  hours_booked: number;
  currency: string;
  payment_status: string;
  payment_method?: string | null;
  payment_reference?: string | null;
  created_at?: string | Date;
  processed_at?: string | Date | null;
}

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
  payments?: Payment[];
  gig_applications?: { id: string }[];
  // Adding other fields for display
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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const navigate = useNavigate();
  // Simplified way to get the gig application ID if it exists
  const gigApplicationId = booking.is_gig_opportunity ? booking.gig_applications?.[0]?.id : undefined;

  const safeFormatDate = (date: any, dateFormat: string) => {
    try { return format(new Date(date), dateFormat); } catch { return "Invalid Date"; }
  };

  const handleDecline = async () => {
    const table = gigApplicationId ? 'gig_applications' : 'bookings';
    const id = gigApplicationId || booking.id;
    await supabase.from(table).update({ status: 'declined' }).eq('id', id);
    onUpdate?.();
  };
  
  const paymentAmount = booking.payments?.[0]?.total_amount;

  const openChat = async () => {
    try {
      // Only support direct bookings here; gig chats are handled elsewhere
      if (!booking.id) return;
      // Find existing conversation for this booking
      let { data: conv, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('booking_id', booking.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!conv) {
        // Create conversation if missing (allowed by RLS for booking participants)
        const { data: created, error: createErr } = await supabase
          .from('conversations')
          .insert({ booking_id: booking.id })
          .select('id')
          .single();
        if (createErr) throw createErr;
        conv = created;
      }
      setConversationId(conv.id);
      setShowChatModal(true);
    } catch (e) {
      console.error('Failed to open chat', e);
    }
  };

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
        {paymentAmount && <div className="font-semibold text-green-600">Amount Paid: ${paymentAmount} {booking.payments?.[0].currency}</div>}
        <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
            {mode === 'booker' && booking.talent_id && <Button onClick={() => navigate(`/talent/${booking.talent_id}`)} variant="outline" size="sm"><User className="h-4 w-4 mr-2" />View Talent</Button>}
            {mode === 'talent' && booking.status === 'pending' && (
                <>
                    <Button onClick={handleDecline} variant="outline" size="sm" className="border-red-200 text-red-600"><X className="h-4 w-4 mr-2" />Decline</Button>
                    <Button onClick={() => setShowInvoiceModal(true)} size="sm"><Check className="h-4 w-4 mr-2" />Accept & Send Invoice</Button>
                </>
            )}
            {/* Universal chat for direct bookings when a talent is assigned */}
            {!booking.is_gig_opportunity && booking.talent_id && (
              <Button onClick={openChat} variant="outline" size="sm">
                <MessageCircle className="h-4 w-4 mr-2" />
                {mode === 'booker' ? 'Message Talent' : 'Message Booker'}
              </Button>
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
      {conversationId && (
        <ChatModal
          open={showChatModal}
          onOpenChange={setShowChatModal}
          conversationId={conversationId}
        />
      )}
    </>
  );
}
