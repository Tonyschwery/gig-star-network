// FILE: src/pages/admin/AdminBookings.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BookingCard, Booking } from "@/components/BookingCard";
import { EventRequestCard, EventRequest } from "@/components/EventRequestCard";
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 15; // Number of items to load per page

const AdminBookings = () => {
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination state
    const [loadingMoreBookings, setLoadingMoreBookings] = useState(false);
    const [loadingMoreRequests, setLoadingMoreRequests] = useState(false);
    const [hasMoreBookings, setHasMoreBookings] = useState(true);
    const [hasMoreRequests, setHasMoreRequests] = useState(true);
    const [bookingsPage, setBookingsPage] = useState(0);
    const [requestsPage, setRequestsPage] = useState(0);

    const fetchData = useCallback(async (page: number, type: 'bookings' | 'requests') => {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        if (type === 'bookings') {
            const { data, error } = await supabase
                .from('bookings')
                .select(`*, talent_profiles(artist_name)`)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) console.error("Admin Error fetching bookings:", error.message);
            return data || [];
        } else { // requests
            const { data, error } = await supabase
                .from('event_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, to);
            
            if (error) console.error("Admin Error fetching requests:", error.message);
            return data || [];
        }
    }, []);

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        const [initialBookings, initialRequests] = await Promise.all([
            fetchData(0, 'bookings'),
            fetchData(0, 'requests')
        ]);

        setDirectBookings(initialBookings as Booking[]);
        setHasMoreBookings(initialBookings.length === PAGE_SIZE);
        setBookingsPage(1);

        setEventRequests(initialRequests as EventRequest[]);
        setHasMoreRequests(initialRequests.length === PAGE_SIZE);
        setRequestsPage(1);

        setLoading(false);
    }, [fetchData]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const handleLoadMore = async (type: 'bookings' | 'requests') => {
        if (type === 'bookings') {
            setLoadingMoreBookings(true);
            const newBookings = await fetchData(bookingsPage, 'bookings');
            setDirectBookings(prev => [...prev, ...newBookings as Booking[]]);
            setHasMoreBookings(newBookings.length === PAGE_SIZE);
            setBookingsPage(prev => prev + 1);
            setLoadingMoreBookings(false);
        } else {
            setLoadingMoreRequests(true);
            const newRequests = await fetchData(requestsPage, 'requests');
            setEventRequests(prev => [...prev, ...newRequests as EventRequest[]]);
            setHasMoreRequests(newRequests.length === PAGE_SIZE);
            setRequestsPage(prev => prev + 1);
            setLoadingMoreRequests(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
        );
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
                                ? directBookings.map(b => <BookingCard key={b.id} booking={b} mode="booker" onUpdate={loadInitialData} />)
                                : <p className="text-muted-foreground text-center py-8">No direct bookings found.</p>}
                        </div>
                        {hasMoreBookings && (
                            <div className="text-center mt-6">
                                <Button onClick={() => handleLoadMore('bookings')} disabled={loadingMoreBookings}>
                                    {loadingMoreBookings ? 'Loading...' : 'Load More'}
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="event_requests" className="pt-4">
                        <div className="space-y-4">
                            {eventRequests.length > 0
                                ? eventRequests.map(req => <EventRequestCard key={req.id} request={req} isActionable={true} mode="booker" />)
                                : <p className="text-muted-foreground text-center py-8">No event requests found.</p>}
                        </div>
                        {hasMoreRequests && (
                            <div className="text-center mt-6">
                                <Button onClick={() => handleLoadMore('requests')} disabled={loadingMoreRequests}>
                                    {loadingMoreRequests ? 'Loading...' : 'Load More'}
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default AdminBookings;