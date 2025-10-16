import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BookingCard, Booking } from "@/components/BookingCard";
import { EventRequestCard, EventRequest } from "@/components/EventRequestCard";
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 15;

const AdminBookings = () => {
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const bookingsQuery = supabase.from('bookings_secure').select(`*, talent_profiles(artist_name)`).order('created_at', { ascending: false });
        const requestsQuery = supabase.from('event_requests').select('*').order('created_at', { ascending: false });

        const [bookingsResult, requestsResult] = await Promise.all([bookingsQuery, requestsQuery]);

        if (bookingsResult.error) console.error("Admin Error fetching bookings:", bookingsResult.error.message);
        else setDirectBookings(bookingsResult.data as Booking[] || []);

        if (requestsResult.error) console.error("Admin Error fetching requests:", requestsResult.error.message);
        else setEventRequests(requestsResult.data as EventRequest[] || []);

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage All Bookings</CardTitle>
                <CardDescription>View all direct bookings and event requests submitted on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="event_requests" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="direct_bookings">Direct Bookings</TabsTrigger>
                        <TabsTrigger value="event_requests">Event Requests</TabsTrigger>
                    </TabsList>
                    <TabsContent value="direct_bookings" className="pt-4">
                        <div className="space-y-4">
                            {directBookings.length > 0
                                ? directBookings.map(b => <BookingCard key={b.id} booking={b} mode="admin" onUpdate={fetchData} onRemove={(bookingId) => {
                                    setDirectBookings(prev => prev.filter(booking => booking.id !== bookingId));
                                }} />)
                                : <p className="text-muted-foreground text-center py-8">No direct bookings found.</p>}
                        </div>
                    </TabsContent>
                    <TabsContent value="event_requests" className="pt-4">
                        <div className="space-y-4">
                            {eventRequests.length > 0
                                ? eventRequests.map(req => <EventRequestCard key={req.id} request={req} isActionable={true} mode="admin" onRemove={(requestId) => {
                                    setEventRequests(prev => prev.filter(r => r.id !== requestId));
                                }} />)
                                : <p className="text-muted-foreground text-center py-8">No event requests found.</p>}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default AdminBookings;