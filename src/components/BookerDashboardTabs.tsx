// PASTE THIS ENTIRE CODE BLOCK INTO src/components/BookerDashboardTabs.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";
import { ChatModal } from "./ChatModal";
import { BookerInvoiceCard } from './BookerInvoiceCard';

interface BookingWithPayment extends Booking {
    payments: any[] | null;
}

export const BookerDashboardTabs = ({ userId }: { userId: string }) => {
    const [bookings, setBookings] = useState<BookingWithPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

    const fetchBookings = useCallback(async () => {
        if (!userId) return;
        
        // *** BUG FIX: Correctly fetch associated payments with the booking ***
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                talent_profiles(*),
                payments(*)
            `)
            .eq('user_id', userId)
            .order('event_date', { ascending: false });

        if (error) {
            console.error("Error fetching bookings:", error);
        } else {
            setBookings(data as BookingWithPayment[] || []);
        }
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        setLoading(true);
        fetchBookings();

        const channel = supabase.channel(`public:bookings:user_id=eq.${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${userId}` }, 
                () => {
                    console.log('Realtime change detected for booker, refetching...');
                    fetchBookings();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId, fetchBookings]);

    const handleOpenChat = async (bookingId: string) => {
        // Find or create conversation for the booking
        const { data: convo, error } = await supabase.from('conversations').select('id').eq('booking_id', bookingId).maybeSingle();
        if (convo) {
            setCurrentConversationId(convo.id);
            setIsChatOpen(true);
        } else {
            const { data: newConvo, error: createError } = await supabase.from('conversations').insert({ booking_id: bookingId }).select().single();
            if (newConvo) {
                setCurrentConversationId(newConvo.id);
                setIsChatOpen(true);
            } else {
                console.error("Failed to create conversation:", createError);
            }
        }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const awaitingResponse = bookings.filter(b => b.status === 'pending');
    const awaitingPayment = bookings.filter(b => b.status === 'pending_approval');
    const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
    const pastBookings = bookings.filter(b => new Date(b.event_date) < today);

    const renderBookingList = (list: BookingWithPayment[]) => (
        list.length > 0
            ? list.map(booking => (
                <div key={booking.id} className="mb-4">
                    <BookingCard 
                        booking={booking} 
                        mode="booker" 
                        onUpdate={fetchBookings} 
                        onOpenChat={handleOpenChat} 
                    />
                    {/* *** BUG FIX: Correctly check for payment data before rendering invoice card *** */}
                    {booking.status === 'pending_approval' && booking.payments && booking.payments.length > 0 && (
                        <BookerInvoiceCard 
                            booking={booking} 
                            payment={booking.payments[0]} 
                            onPaymentUpdate={fetchBookings} 
                        />
                    )}
                </div>
            ))
            : <p className="text-muted-foreground text-center py-4">No bookings in this category.</p>
    );

    if (loading) return <div>Loading bookings...</div>;

    return (
        <>
            <Tabs defaultValue="awaiting_response" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="awaiting_response">Awaiting Response ({awaitingResponse.length})</TabsTrigger>
                    <TabsTrigger value="awaiting_payment">Invoices ({awaitingPayment.length})</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
                    <TabsTrigger value="past">Past Events ({pastBookings.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="awaiting_response">{renderBookingList(awaitingResponse)}</TabsContent>
                <TabsContent value="awaiting_payment">{renderBookingList(awaitingPayment)}</TabsContent>
                <TabsContent value="upcoming">{renderBookingList(upcomingBookings)}</TabsContent>
                <TabsContent value="past">{renderBookingList(pastBookings)}</TabsContent>
            </Tabs>
            {isChatOpen && currentConversationId && (
                <ChatModal 
                    conversationId={currentConversationId} 
                    onClose={() => setIsChatOpen(false)} 
                />
            )}
        </>
    );
};