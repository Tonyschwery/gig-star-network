import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard } from "./BookingCard";
import { EventRequestCard } from "./EventRequestCard";

// Define the types for the data we expect from Supabase for clarity
interface Booking {
  id: string;
  [key: string]: any;
}

interface EventRequest {
  id: string;
  [key: string]: any;
}

export const BookerDashboardTabs = ({ userId }: { userId: string }) => {
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // A single, efficient function to fetch all necessary data for the booker's dashboard
    const fetchData = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        // Fetch Direct Bookings made by this user that have not been cancelled
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`*, talent_profiles(artist_name)`) // Also get the talent's name
            .eq('user_id', userId)
            .neq('status', 'cancelled') // This implements the "remove from view" logic
            .order('event_date', { ascending: true });

        if (bookingsError) {
            console.error("Error fetching direct bookings:", bookingsError.message);
        } else {
            setDirectBookings(bookingsData || []);
        }

        // Fetch Event Requests made by this user that have not been declined
        const { data: requestsData, error: requestsError } = await supabase
            .from('event_requests')
            .select('*')
            .eq('user_id', userId)
            .not('status', 'in', '("declined", "cancelled")')
            .order('created_at', { ascending: false });

        if (requestsError) {
            console.error("Error fetching event requests:", requestsError.message);
        } else {
            setEventRequests(requestsData || []);
        }

        setLoading(false);
    }, [userId]); // This function will re-run if the userId changes

    // Fetch data when the component first mounts
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
                            // isActionable is true here because bookers can always chat
                            : <p className="text-muted-foreground text-center py-8">You have not made any event requests to our team.</p>}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

