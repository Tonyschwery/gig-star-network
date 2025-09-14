// FILE: src/components/TalentDashboardTabs.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard } from "./BookingCard";
import { EventRequestCard } from "./EventRequestCard";

// Define the types for clarity
interface Booking {
  id: string;
  [key: string]: any;
}

interface EventRequest {
  id: string;
  [key: string]: any;
}

interface TalentProfile {
    id: string;
    location?: string;
    is_pro_subscriber?: boolean;
}

interface TalentDashboardTabsProps {
    profile: TalentProfile;
}

export const TalentDashboardTabs = ({ profile }: TalentDashboardTabsProps) => {
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!profile || !profile.id) {
            setLoading(false);
            return;
        }
        setLoading(true);

        // 1. Fetch Direct Bookings assigned to this talent
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`*`)
            .eq('talent_id', profile.id)
            .order('event_date', { ascending: false });

        if (bookingsError) {
            console.error("Error fetching direct bookings:", bookingsError.message);
        } else {
            setDirectBookings(bookingsData || []);
        }

        // 2. Fetch Event Requests that match the talent's location
        // IMPORTANT: This assumes 'event_location' in event_requests matches 'location' in talent_profiles.
        // Adjust the .eq('event_location', profile.location) if your matching logic is different.
        if (profile.location) {
            const { data: requestsData, error: requestsError } = await supabase
                .from('event_requests')
                .select('*')
                .eq('event_location', profile.location) // This is the matching logic
                .not('status', 'in', '("declined", "cancelled")')
                .order('created_at', { ascending: false });

            if (requestsError) {
                console.error("Error fetching matching event requests:", requestsError.message);
            } else {
                setEventRequests(requestsData || []);
            }
        }

        setLoading(false);
    }, [profile]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading Your Opportunities...</p>
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
                            ? directBookings.map(b => <BookingCard key={b.id} booking={b} mode="talent" onUpdate={fetchData} />)
                            : <p className="text-muted-foreground text-center py-8">You have not received any direct bookings.</p>}
                    </div>
                </TabsContent>
                <TabsContent value="event_requests" className="pt-4">
                    <div className="space-y-4">
                        {eventRequests.length > 0
                            ? eventRequests.map(req => (
                                <EventRequestCard 
                                    key={req.id} 
                                    request={req} 
                                    isActionable={profile.is_pro_subscriber || false} // This enables/disables the chat button
                                    mode="talent" 
                                />
                              ))
                            : <p className="text-muted-foreground text-center py-8">No event requests match your location at this time.</p>}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};