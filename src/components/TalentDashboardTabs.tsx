// FILE: src/components/TalentDashboardTabs.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard"; // THE FIX: Import the strict Booking interface
import { EventRequestCard, EventRequest } from "./EventRequestCard"; // THE FIX: Import the strict EventRequest interface
import { useTalentBookingLimit } from '@/hooks/useTalentBookingLimit';

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
    const { acceptedBookingsThisMonth, isProUser } = useTalentBookingLimit();

    const fetchData = useCallback(async () => {
        if (!profile || !profile.id) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`*, talent_profiles(artist_name)`)
            .eq('talent_id', profile.id)
            .order('event_date', { ascending: false });

        if (bookingsError) {
            console.error("Error fetching direct bookings:", bookingsError.message);
        } else {
            setDirectBookings(bookingsData as Booking[] || []);
        }

        if (profile.location) {
            const { data: requestsData, error: requestsError } = await supabase
                .from('event_requests')
                .select('*')
                .eq('event_location', profile.location)
                .not('status', 'in', '("declined", "cancelled")')
                .order('created_at', { ascending: false });

            if (requestsError) {
                console.error("Error fetching matching event requests:", requestsError.message);
            } else {
                setEventRequests(requestsData as EventRequest[] || []);
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
                            ? directBookings.map((b, index) => {
                                // Only blur contact details for the FIRST pending booking when limit is reached
                                const shouldBlurContact = !isProUser && 
                                    acceptedBookingsThisMonth >= 1 && 
                                    b.status === 'pending' && 
                                    index === directBookings.findIndex(booking => booking.status === 'pending');
                                
                                return (
                                    <BookingCard 
                                        key={b.id} 
                                        booking={b} 
                                        mode="talent" 
                                        onUpdate={fetchData} 
                                        onRemove={(bookingId) => {
                                            setDirectBookings(prev => prev.filter(booking => booking.id !== bookingId));
                                        }}
                                        shouldBlurContact={shouldBlurContact}
                                    />
                                );
                            })
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
                                    isActionable={profile.is_pro_subscriber || false}
                                    mode="talent"
                                    onRemove={(requestId) => {
                                        setEventRequests(prev => prev.filter(r => r.id !== requestId));
                                    }}
                                />
                              ))
                            : <p className="text-muted-foreground text-center py-8">No event requests match your location at this time.</p>}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};