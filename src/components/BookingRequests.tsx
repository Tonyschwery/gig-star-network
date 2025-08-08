// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";

interface BookingRequestsProps {
    talentId: string;
    isProSubscriber?: boolean;
}

export const BookingRequests = ({ talentId, isProSubscriber }: BookingRequestsProps) => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = useCallback(async () => {
        if (!talentId) return;
        const { data, error } = await supabase.from('bookings').select(`*, payments(*)`).eq('talent_id', talentId).eq('is_gig_opportunity', false).order('event_date', { ascending: false });
        if (error) console.error("Error fetching direct bookings:", error);
        else setBookings(data || []);
        setLoading(false);
    }, [talentId]);

    useEffect(() => {
        fetchBookings();
        const channel = supabase.channel(`public:bookings:talent_id=eq.${talentId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [talentId, fetchBookings]);


    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newRequests = bookings.filter(b => b.status === 'pending');
    const pendingApproval = bookings.filter(b => b.status === 'pending_approval');
    const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
    const pastBookings = bookings.filter(b => new Date(b.event_date) < today);

    const renderBookings = (list: Booking[]) => (
        list.length > 0
            ? list.map(b => <BookingCard key={b.id} booking={b} mode="talent" onUpdate={fetchBookings} isProSubscriber={isProSubscriber} onOpenChat={handleOpenChat} />)
            : <p className="text-muted-foreground text-center py-4">No bookings in this category.</p>
    );

    if (loading) return <div>Loading...</div>;

    return (
        <>
            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="pending">New ({newRequests.length})</TabsTrigger>
                    <TabsTrigger value="pending_approval">Pending ({pendingApproval.length})</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
                    <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="pending">{renderBookings(newRequests)}</TabsContent>
                <TabsContent value="pending_approval">{renderBookings(pendingApproval)}</TabsContent>
                <TabsContent value="upcoming">{renderBookings(upcomingBookings)}</TabsContent>
                <TabsContent value="past">{renderBookings(pastBookings)}</TabsContent>
            </Tabs>
            {isChatOpen && currentConversationId && (
                <ChatModal conversationId={currentConversationId} onClose={() => setIsChatOpen(false)} />
            )}
        </>
    );
};