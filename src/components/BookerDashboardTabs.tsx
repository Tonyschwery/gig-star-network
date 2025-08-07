// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";
import { ChatModal } from "./ChatModal";
import { BookerInvoiceCard } from './BookerInvoiceCard';

export const BookerDashboardTabs = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('bookings')
      .select(`*, talent_profiles(*), payment:payments(*)`)
      .eq('user_id', user.id)
      .order('event_date', { ascending: false });
    
    if (error) console.error("Error fetching bookings:", error);
    else setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchBookings();

    const channel = supabase.channel(`public:bookings:user_id=eq.${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleOpenChat = async (bookingId: string) => {
    const { data, error } = await supabase.from('conversations').select('id').eq('booking_id', bookingId).single();
    if (data) {
      setCurrentConversationId(data.id);
      setIsChatOpen(true);
    } else {
      console.error("Could not find conversation for this booking", error);
    }
  };

  // *** BUG FIX: Corrected and simplified filtering logic ***
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const awaitingPaymentBookings = bookings.filter(b => b.status === 'pending_approval');
  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
  const pastBookings = bookings.filter(b => new Date(b.event_date) < today);
  
  const renderBookings = (list: Booking[]) => (
    list.length > 0
      ? list.map(b => (
          <div key={b.id}>
            <BookingCard booking={b} mode="booker" onUpdate={fetchBookings} onOpenChat={handleOpenChat} />
            {b.status === 'pending_approval' && b.payment?.[0] && (
                <BookerInvoiceCard booking={b} payment={b.payment[0]} onPaymentUpdate={fetchBookings} />
            )}
          </div>
        ))
      : <p className="text-muted-foreground text-center py-4">No bookings in this category.</p>
  );

  return (
    <>
      <Tabs defaultValue="awaiting_payment" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="awaiting_payment">Invoices / Awaiting Payment ({awaitingPaymentBookings.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming/Confirmed ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="past">Past Events ({pastBookings.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="awaiting_payment">{renderBookings(awaitingPaymentBookings)}</TabsContent>
        <TabsContent value="upcoming">{renderBookings(upcomingBookings)}</TabsContent>
        <TabsContent value="past">{renderBookings(pastBookings)}</TabsContent>
      </Tabs>
      {isChatOpen && currentConversationId && (
        <ChatModal conversationId={currentConversationId} onClose={() => setIsChatOpen(false)} />
      )}
    </>
  );
};