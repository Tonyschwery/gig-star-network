import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";
import { EventRequestCard, EventRequest } from "./EventRequestCard"; // Assuming you have a card for requests

export const TalentDashboardTabs = () => {
    const { user, profile } = useAuth();
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [gigOpportunities, setGigOpportunities] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user?.id || !profile?.id) return;
        
        setLoading(true);
        // Fetch Direct Bookings (status is not cancelled)
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`*`)
            .eq('talent_id', profile.id)
            .neq('status', 'cancelled')
            .order('event_date', { ascending: true });

        // Fetch Indirect Bookings/Gig Opportunities
        const { data: requestsData, error: requestsError } = await supabase
            .from('event_requests')
            .select('*')
            .eq('assigned_talent_id', profile.id) // Assuming this column links admin requests to talents
            .neq('status', 'declined')
            .order('created_at', { ascending: false });

        if (bookingsError) console.error("Error fetching direct bookings:", bookingsError);
        else setDirectBookings(bookingsData || []);

        if (requestsError) console.error("Error fetching gig opportunities:", requestsError);
        else setGigOpportunities(requestsData || []);

        setLoading(false);
    }, [user, profile]);

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
                    <TabsTrigger value="gig_opportunities">
                        Gig Opportunities ({gigOpportunities.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="direct_bookings">
                    <div className="space-y-4 pt-4">
                        {directBookings.length > 0
                            ? directBookings.map(b => <BookingCard key={b.id} booking={b} mode="talent" onUpdate={fetchData} />)
                            : <p className="text-muted-foreground text-center py-4">No direct bookings found.</p>}
                    </div>
                </TabsContent>
                <TabsContent value="gig_opportunities">
                    <div className="space-y-4 pt-4">
                        {gigOpportunities.length > 0
                            ? gigOpportunities.map(req => <EventRequestCard key={req.id} request={req} mode="talent" onUpdate={fetchData} />)
                            : <p className="text-muted-foreground text-center py-4">No new gig opportunities from admin.</p>}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

// You will likely need a new component for EventRequestCard, you can start with this:
// src/components/EventRequestCard.tsx
/*
export const EventRequestCard = ({ request, mode, onUpdate }) => {
    // ... UI to display the details of an event request ...
    // ... It should have its own Accept/Decline/Chat buttons ...
}
*/