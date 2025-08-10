// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";

import { BookerInvoiceCard } from './BookerInvoiceCard';
import { UniversalChatWidget } from "@/components/UniversalChatWidget";

export const BookerDashboardTabs = ({ userId }: { userId: string }) => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = useCallback(async () => {
        if (!userId) return;
        const { data, error } = await supabase.from('bookings').select(`*, talent_profiles(*), payments(*)`).eq('user_id', userId).order('event_date', { ascending: false });
        if (error) console.error("Error fetching bookings:", error);
        else setBookings(data || []);
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchBookings();
        const channel = supabase.channel(`public:bookings:user_id=eq.${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userId, fetchBookings]);


    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const awaitingResponse = bookings.filter(b => b.status === 'pending');
    const awaitingPayment = bookings.filter(b => b.status === 'pending_approval');
    const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
    const pastBookings = bookings.filter(b => new Date(b.event_date) < today);

    const renderBookingList = (list: Booking[]) => (
        list.length > 0
            ? list.map(booking => (
                <div key={booking.id} className="mb-4">
                    <BookingCard booking={booking} mode="booker" onUpdate={fetchBookings} />
                    {booking.status === 'pending_approval' && booking.payments && booking.payments.length > 0 && (
                        <BookerInvoiceCard booking={booking as any} payment={booking.payments[0] as any} onPaymentUpdate={fetchBookings} />
                    )}
                </div>
            ))
            : <p className="text-muted-foreground text-center py-4">No bookings in this category.</p>
    );

    if (loading) return <div>Loading...</div>;

    return (
        <>
            <Tabs defaultValue="awaiting_response" className="w-full">
                <TabsList className="w-full flex gap-2 overflow-x-auto whitespace-nowrap md:grid md:grid-cols-4">
                    <TabsTrigger value="awaiting_response" className="shrink-0">Awaiting Response ({awaitingResponse.length})</TabsTrigger>
                    <TabsTrigger value="awaiting_payment" className="shrink-0">Invoices ({awaitingPayment.length})</TabsTrigger>
                    <TabsTrigger value="upcoming" className="shrink-0">Upcoming ({upcomingBookings.length})</TabsTrigger>
                    <TabsTrigger value="past" className="shrink-0">Past Events ({pastBookings.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="awaiting_response">{renderBookingList(awaitingResponse)}</TabsContent>
                <TabsContent value="awaiting_payment">{renderBookingList(awaitingPayment)}</TabsContent>
                <TabsContent value="upcoming">{renderBookingList(upcomingBookings)}</TabsContent>
                <TabsContent value="past">{renderBookingList(pastBookings)}</TabsContent>
            </Tabs>
            <UniversalChatWidget />
        </>
    );
};