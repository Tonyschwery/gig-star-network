import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { BookerNotificationBadge } from "./BookerNotificationBadge";

export const BookerDashboardTabs = ({ userId }: { userId: string }) => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = useCallback(async () => {
        if (!userId) return;
        console.log('Fetching bookings for booker:', userId);
        
        const { data, error } = await supabase
            .from('bookings')
            .select(`*, talent_profiles(*)`)
            .eq('user_id', userId)
            .order('event_date', { ascending: false });
            
        if (error) {
            console.error("Error fetching bookings:", error);
        } else {
            console.log('Fetched bookings:', data?.length);
            setBookings(data || []);
        }
        setLoading(false);
    }, [userId]);

    // Use real-time hooks
    useRealtimeBookings(fetchBookings);
    useRealtimeNotifications();

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const awaitingResponse = bookings.filter(b => b.status === 'pending');
    const acceptedBookings = bookings.filter(b => b.status === 'accepted');
    const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
    const pastBookings = bookings.filter(b => new Date(b.event_date) < today);

    const renderBookingList = (list: Booking[]) => (
        list.length > 0
            ? list.map(booking => (
                <div key={booking.id} className="mb-4">
                    <BookingCard booking={booking} mode="booker" onUpdate={fetchBookings} />
                </div>
            ))
            : <p className="text-muted-foreground text-center py-4">No bookings in this category.</p>
    );

    if (loading) return <div>Loading...</div>;

    return (
        <>
            {/* Notification Badge */}
            <BookerNotificationBadge />
            
            <Tabs defaultValue="awaiting_response" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1">
                    <TabsTrigger value="awaiting_response" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Awaiting Response</span>
                        <span className="sm:hidden">Awaiting</span>
                        <span className="ml-1">({awaitingResponse.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="accepted" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Accepted</span>
                        <span className="sm:hidden">Accepted</span>
                        <span className="ml-1">({acceptedBookings.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="upcoming" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Upcoming</span>
                        <span className="sm:hidden">Future</span>
                        <span className="ml-1">({upcomingBookings.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="past" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Past Events</span>
                        <span className="sm:hidden">Past</span>
                        <span className="ml-1">({pastBookings.length})</span>
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="awaiting_response">{renderBookingList(awaitingResponse)}</TabsContent>
                <TabsContent value="accepted">{renderBookingList(acceptedBookings)}</TabsContent>
                <TabsContent value="upcoming">{renderBookingList(upcomingBookings)}</TabsContent>
                <TabsContent value="past">{renderBookingList(pastBookings)}</TabsContent>
            </Tabs>
        </>
    );
};