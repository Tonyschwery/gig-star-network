import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";
import { EventRequestCard, EventRequest } from "./EventRequestCard"; // Assuming a shared card

export const BookerDashboardTabs = ({ userId }: { userId: string }) => {
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        // Fetch Direct Bookings made by this user that are not cancelled
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`*, talent_profiles(artist_name)`)
            .eq('user_id', userId)
            .neq('status', 'cancelled')
            .order('event_date', { ascending: true });

        // Fetch Event Requests made by this user
        const { data: requestsData, error: requestsError } = await supabase
            .from('event_requests')
            .select('*')
            .eq('user_id', userId)
            .neq('status', 'declined')
            .order('created_at', { ascending: false });

        if (bookingsError) console.error("Error fetching direct bookings:", bookingsError);
        else setDirectBookings(bookingsData || []);

        if (requestsError) console.error("Error fetching event requests:", requestsError);
        else setEventRequests(requestsData || []);

        setLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <div className="text-center py-8">Loading bookings...</div>;

    return (
        <div className="w-full">
            <Tabs defaultValue="direct_bookings" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="direct_bookings">
                        Direct Bookings ({directBookings.length})
                    </TabsTrigger>
                    <TabsTrigger value="event_requests">
                        Event Requests ({eventRequests.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="direct_bookings">
                    <div className="space-y-4 pt-4">
                        {directBookings.length > 0
                            ? directBookings.map(b => <BookingCard key={b.id} booking={b} mode="booker" onUpdate={fetchData} />)
                            : <p className="text-muted-foreground text-center py-4">You have not made any direct bookings.</p>}
                    </div>
                </TabsContent>
                <TabsContent value="event_requests">
                    <div className="space-y-4 pt-4">
                        {eventRequests.length > 0
                            ? eventRequests.map(req => <EventRequestCard key={req.id} request={req} mode="booker" onUpdate={fetchData} />)
                            : <p className="text-muted-foreground text-center py-4">You have not made any event requests to admin.</p>}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};