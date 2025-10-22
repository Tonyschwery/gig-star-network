// FILE: src/components/BookerDashboardTabs.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookingCard, Booking } from "./BookingCard";
import { EventRequestCard, EventRequest } from "./EventRequestCard";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { useRealtimeEventRequests } from "@/hooks/useRealtimeEventRequests";
import { useTotalUnreadCount } from "@/hooks/useTotalUnreadCount";

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
    
    // Get total unread counts for tab badges
    const { totalUnread: bookingsUnread } = useTotalUnreadCount('booking');
    const { totalUnread: requestsUnread } = useTotalUnreadCount('event_request');

    const fetchInitialData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        // CHROME CACHE BUST: Add timestamp to force fresh data in Chrome
        const timestamp = Date.now();
        console.log('Fetching initial bookings for user:', userId, 'at timestamp:', timestamp);
        
        const bookingsQuery = supabase
            .from('bookings')
            .select(`*, talent_profiles(artist_name)`)
            .eq('user_id', userId)
            .order('event_date', { ascending: true })
            .range(0, PAGE_SIZE - 1);

        const requestsQuery = supabase
            .from('event_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(0, PAGE_SIZE - 1);

        // Run queries in parallel for efficiency
        const [bookingsResult, requestsResult] = await Promise.all([bookingsQuery, requestsQuery]);

        if (bookingsResult.error) console.error("Error fetching bookings:", bookingsResult.error.message);
        else {
            console.log('Fetched bookings:', bookingsResult.data?.length || 0, 'records');
            console.log('Booking statuses found:', bookingsResult.data?.map(b => `${b.id}: ${b.status}`));
            setDirectBookings(bookingsResult.data as Booking[] || []);
            setHasMoreBookings(bookingsResult.data.length === PAGE_SIZE);
            setBookingsPage(1);
        }

        if (requestsResult.error) console.error("Error fetching requests:", requestsResult.error.message);
        else {
            console.log('Fetched event requests:', requestsResult.data?.length || 0, 'records');
            console.log('Event request statuses found:', requestsResult.data?.map(r => `${r.id}: ${r.status}`));
            setEventRequests(requestsResult.data as EventRequest[] || []);
            setHasMoreRequests(requestsResult.data.length === PAGE_SIZE);
            setRequestsPage(1);
        }

        setLoading(false);
    }, [userId]);

    // Enhanced removal handlers with logging
    const handleBookingRemove = useCallback((bookingId: string) => {
        console.log('Removing booking from booker dashboard:', bookingId);
        setDirectBookings(prev => {
            const filtered = prev.filter(booking => booking.id !== bookingId);
            console.log('Bookings after removal:', filtered.length);
            return filtered;
        });
    }, []);

    const handleEventRequestRemove = useCallback((requestId: string) => {
        console.log('Removing event request from booker dashboard:', requestId);
        setEventRequests(prev => {
            const filtered = prev.filter(r => r.id !== requestId);
            console.log('Event requests after removal:', filtered.length);
            return filtered;
        });
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Enable realtime updates for bookings and event requests
    useRealtimeBookings(fetchInitialData);
    useRealtimeEventRequests(fetchInitialData);

    const loadMoreBookings = async () => {
        if (!userId || loadingMoreBookings) return;
        setLoadingMoreBookings(true);
        const from = bookingsPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
            .from('bookings')
            .select(`*, talent_profiles(artist_name)`)
            .eq('user_id', userId)
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
                    <TabsTrigger value="direct_bookings" className="relative">
                        Direct Bookings ({directBookings.length})
                        {bookingsUnread > 0 && (
                            <Badge 
                                variant="destructive" 
                                className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                            >
                                {bookingsUnread > 9 ? "9+" : bookingsUnread}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="event_requests" className="relative">
                        Event Requests ({eventRequests.length})
                        {requestsUnread > 0 && (
                            <Badge 
                                variant="destructive" 
                                className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                            >
                                {requestsUnread > 9 ? "9+" : requestsUnread}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="direct_bookings" className="pt-4">
                    <div className="space-y-4">
                        {directBookings.length > 0 ? (
                            directBookings.map(b => <BookingCard 
                                key={b.id} 
                                booking={b} 
                                mode="booker" 
                                onUpdate={fetchInitialData} 
                                onRemove={handleBookingRemove} 
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
                    onRemove={handleEventRequestRemove}
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