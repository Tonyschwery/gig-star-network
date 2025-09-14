import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard } from "./BookingCard";
import { EventRequestCard } from "./EventRequestCard"; // We will create/update this component next
//stk
// Define the types for the data we expect from Supabase
interface Booking {
  id: string;
  // Add other booking properties as needed from your BookingCard component
  [key: string]: any; 
}

interface EventRequest {
  id: string;
  // Add other event request properties as needed
  [key: string]: any;
}

export const TalentDashboardTabs = () => {
    const { user, profile } = useAuth(); // Get the full user and profile from our stable auth hook
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [gigOpportunities, setGigOpportunities] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const isPro = profile?.is_pro_subscriber === true;

    // Use a single, efficient function to fetch all necessary data
    const fetchData = useCallback(async () => {
        // Guard clause: Don't run if we don't have the necessary user/profile info
        if (!user?.id || !profile?.id) return;
        
        setLoading(true);

        // Fetch Direct Bookings for this talent that are not cancelled or declined
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`*`)
            .eq('talent_id', profile.id)
            .not('status', 'in', '("cancelled", "declined")')
            .order('event_date', { ascending: true });

        if (bookingsError) {
            console.error("Error fetching direct bookings:", bookingsError.message);
        } else {
            setDirectBookings(bookingsData || []);
        }

        // Fetch Gig Opportunities (Event Requests) that match the talent's location
        if (profile.location) {
          const { data: requestsData, error: requestsError } = await supabase
              .from('event_requests')
              .select('*')
              .eq('status', 'pending') // Only show open requests
              .eq('event_location', profile.location) // THE KEY: Location matching
              .order('created_at', { ascending: false });

          if (requestsError) {
              console.error("Error fetching gig opportunities:", requestsError.message);
          } else {
              setGigOpportunities(requestsData || []);
          }
        }

        setLoading(false);
    }, [user, profile]); // This function will re-run if the user or profile changes

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
                    <TabsTrigger value="direct_bookings">Direct Bookings ({directBookings.length})</TabsTrigger>
                    <TabsTrigger value="gig_opportunities">Gig Opportunities ({gigOpportunities.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="direct_bookings" className="pt-4">
                    <div className="space-y-4">
                        {directBookings.length > 0
                            ? directBookings.map(b => <BookingCard key={b.id} booking={b} mode="talent" onUpdate={fetchData} />)
                            : <p className="text-muted-foreground text-center py-8">No direct bookings found.</p>}
                    </div>
                </TabsContent>
                <TabsContent value="gig_opportunities" className="pt-4">
                    <div className="space-y-4">
                        {gigOpportunities.length > 0
                            ? gigOpportunities.map(req => (
                                <EventRequestCard 
                                  key={req.id} 
                                  request={req} 
                                  isActionable={isPro} // Pro talents can interact
                                  mode="talent"
                                />
                              ))
                            : <p className="text-muted-foreground text-center py-8">No new gig opportunities in your location.</p>}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

