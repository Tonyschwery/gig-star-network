// FILE: src/components/BookerDashboardTabs.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard"; // THE FIX: Import the strict Booking interface
import { EventRequestCard, EventRequest } from "./EventRequestCard"; // THE FIX: Import the strict EventRequest interface

export const BookerDashboardTabs = ({ userId }: { userId: string }) => {
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`*, talent_profiles(artist_name)`)
            .eq('user_id', userId)
            .neq('status', 'cancelled')
            .order('event_date', { ascending: true });

        if (bookingsError) {
            console.error("Error fetching direct bookings:", bookingsError.message);
        } else {
            setDirectBookings(bookingsData as Booking[] || []);
        }

        const { data: requestsData, error: requestsError } = await supabase
            .from('event_requests')
            .select('*')
            .eq('user_id', userId)
            .not('status', 'in', '("declined", "cancelled")')
            .order('created_at', { ascending: false });

        if (requestsError) {
            console.error("Error fetching event requests:", requestsError.message);
        } else {
            setEventRequests(requestsData as EventRequest[] || []);
        }

        setLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading Your Bookings...</p>
            </div>
        );
    }

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
                <TabsContent value="direct_bookings" className="pt-4">
                    <div className="space-y-4">
                        {directBookings.length > 0
                            ? directBookings.map(b => <BookingCard key={b.id} booking={b} mode="booker" onUpdate={fetchData} />)
                            : <p className="text-muted-foreground text-center py-8">You have not made any direct bookings.</p>}
                    </div>
                </TabsContent>
                <TabsContent value="event_requests" className="pt-4">
                    <div className="space-y-4">
                        {eventRequests.length > 0
                            ? eventRequests.map(req => <EventRequestCard key={req.id} request={req} isActionable={true} mode="booker" />)
                            : <p className="text-muted-foreground text-center py-8">You have not made any event requests to our team.</p>}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};