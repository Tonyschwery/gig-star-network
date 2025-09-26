// FILE: src/components/BookerDashboardTabs.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BookingCard, Booking } from "./BookingCard";
import { EventRequestCard, EventRequest } from "./EventRequestCard";

const PAGE_SIZE = 10; // We will load 10 items at a time

export const BookerDashboardTabs = ({ userId }: { userId: string }) => {
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMoreBookings, setLoadingMoreBookings] = useState(false);
    const [loadingMoreRequests, setLoadingMoreRequests] = useState(false);
    const [hasMoreBookings, setHasMoreBookings] = useState(true);
    const [hasMoreRequests, setHasMoreRequests] = useState(true);
    const [bookingsPage, setBookingsPage] = useState(0);
    const [requestsPage, setRequestsPage] = useState(0);

    const fetchInitialData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        console.log('Fetching initial bookings for user:', userId);
        const bookingsQuery = supabase
            .from('bookings')
            .select(`*, talent_profiles(artist_name)`)
            .eq('user_id', userId)
            .not('status', 'in', '(declined,cancelled)')
            .order('event_date', { ascending: true })
            .range(0, PAGE_SIZE - 1);

        const requestsQuery = supabase
            .from('event_requests')
            .select('*')
            .eq('user_id', userId)
            .not('status', 'in', '(declined,cancelled)')
            .order('created_at', { ascending: false })
            .range(0, PAGE_SIZE - 1);

        // Run queries in parallel for efficiency
        const [bookingsResult, requestsResult] = await Promise.all([bookingsQuery, requestsQuery]);

        if (bookingsResult.error) console.error("Error fetching bookings:", bookingsResult.error.message);
        else {
            console.log('Fetched bookings:', bookingsResult.data?.length || 0, 'records');
            setDirectBookings(bookingsResult.data as Booking[] || []);
            setHasMoreBookings(bookingsResult.data.length === PAGE_SIZE);
            setBookingsPage(1);
        }

        if (requestsResult.error) console.error("Error fetching requests:", requestsResult.error.message);
        else {
            setEventRequests(requestsResult.data as EventRequest[] || []);
            setHasMoreRequests(requestsResult.data.length === PAGE_SIZE);
            setRequestsPage(1);
        }

        setLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const loadMoreBookings = async () => {
        if (!userId || loadingMoreBookings) return;
        setLoadingMoreBookings(true);
        const from = bookingsPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
            .from('bookings')
            .select(`*, talent_profiles(artist_name)`)
            .eq('user_id', userId)
            .not('status', 'in', '(declined,cancelled)')
            .order('event_date', { ascending: true })
            .range(from, to);
        
        if (error) console.error("Error fetching more bookings:", error.message);
        else if (data) {
            setDirectBookings(prev => [...prev, ...data as Booking[]]);
            setHasMoreBookings(data.length === PAGE_SIZE);
            setBookingsPage(prev => prev + 1);
        }
        setLoadingMoreBookings(false);
    };
    
    const loadMoreRequests = async () => {
        if (!userId || loadingMoreRequests) return;
        setLoadingMoreRequests(true);
        const from = requestsPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
            .from('event_requests')
            .select('*')
            .eq('user_id', userId)
            .not('status', 'in', '(declined,cancelled)')
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) console.error("Error fetching more requests:", error.message);
        else if (data) {
            setEventRequests(prev => [...prev, ...data as EventRequest[]]);
            setHasMoreRequests(data.length === PAGE_SIZE);
            setRequestsPage(prev => prev + 1);
        }
        setLoadingMoreRequests(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <Tabs defaultValue="direct_bookings" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="direct_bookings">Direct Bookings ({directBookings.length})</TabsTrigger>
                    <TabsTrigger value="event_requests">Event Requests ({eventRequests.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="direct_bookings" className="pt-4">
                    <div className="space-y-4">
                        {directBookings.length > 0 ? (
                            directBookings.map(b => <BookingCard 
                                key={b.id} 
                                booking={b} 
                                mode="booker" 
                                onUpdate={fetchInitialData} 
                                onRemove={(bookingId) => {
                                    console.log('Removing booking from booker dashboard:', bookingId);
                                    setDirectBookings(prev => prev.filter(booking => booking.id !== bookingId));
                                }} 
                            />)
                        ) : (
                            <p className="text-muted-foreground text-center py-8">You have not made any direct bookings.</p>
                        )}
                    </div>
                    {hasMoreBookings && (
                        <div className="text-center mt-6">
                            <Button onClick={loadMoreBookings} disabled={loadingMoreBookings}>
                                {loadingMoreBookings ? 'Loading...' : 'Load More'}
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="event_requests" className="pt-4">
    <div className="space-y-4">
        {eventRequests.length > 0 ? (
            eventRequests.map((req, index) => {
                return <EventRequestCard 
                    key={req.id} 
                    request={req} 
                    isActionable={true} 
                    mode="booker"
                    onRemove={(requestId) => {
                        setEventRequests(prev => prev.filter(r => r.id !== requestId));
                    }}
                />
            })
        ) : (
            <p className="text-muted-foreground text-center py-8">You have not made any event requests to our team.</p>
        )}
    </div>
    {hasMoreRequests && (
        <div className="text-center mt-6">
            <Button onClick={loadMoreRequests} disabled={loadingMoreRequests}>
                {loadingMoreRequests ? 'Loading...' : 'Load More'}
            </Button>
        </div>
    )}
</TabsContent>
            </Tabs>
        </div>
    );
};