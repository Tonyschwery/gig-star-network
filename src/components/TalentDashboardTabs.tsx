// FILE: src/components/TalentDashboardTabs.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookingCard, Booking } from "./BookingCard"; // THE FIX: Import the strict Booking interface
import { EventRequestCard, EventRequest } from "./EventRequestCard"; // THE FIX: Import the strict EventRequest interface
import { useTalentBookingLimit } from '@/hooks/useTalentBookingLimit';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useRealtimeEventRequests } from '@/hooks/useRealtimeEventRequests';
import { useTotalUnreadCount } from '@/hooks/useTotalUnreadCount';

interface TalentProfile {
    id: string;
    location?: string;
    is_pro_subscriber?: boolean;
    artist_name?: string;
    user_id?: string;
    // Allow any additional properties from the actual talent profile
    [key: string]: any;
}

interface TalentDashboardTabsProps {
    profile: TalentProfile;
}

export const TalentDashboardTabs = ({ profile }: TalentDashboardTabsProps) => {
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { receivedBookingsThisMonth, isProUser } = useTalentBookingLimit();
    
    // Get total unread counts for tab badges
    const { totalUnread: bookingsUnread } = useTotalUnreadCount('booking');
    const { totalUnread: requestsUnread } = useTotalUnreadCount('event_request');

  const fetchData = useCallback(async () => {
    if (!profile || !profile.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    console.log('Fetching bookings for talent:', profile.id);

    // CHROME CACHE BUST: Add timestamp to force fresh data in Chrome
    const timestamp = Date.now();
    const cacheBuster = `?_t=${timestamp}`;
    console.log('Cache buster applied:', cacheBuster);

    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings_secure')
      .select(`*, talent_profiles(artist_name)`)
      .eq('talent_id', profile.id)
      .order('event_date', { ascending: false });

    if (bookingsError) {
      console.error("Error fetching direct bookings:", bookingsError.message);
    } else {
      console.log('Fetched bookings:', bookingsData?.length || 0, 'records');
      console.log('Booking statuses found:', bookingsData?.map(b => `${b.id}: ${b.status}`));
      setDirectBookings(bookingsData as Booking[] || []);
    }

    if (profile.location && profile.user_id) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Build query with talent type matching
      let query = supabase
        .from('event_requests')
        .select('*')
        .eq('event_location', profile.location)
        .gte('event_date', today.toISOString().split('T')[0])
        .not('hidden_by_talents', 'cs', `{${profile.user_id}}`);
      
      // Filter by talent type if specified in request (case-insensitive)
      if (profile.act) {
        query = query.ilike('talent_type_needed', profile.act);
      }
      
      const { data: requestsData, error: requestsError } = await query
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error("Error fetching matching event requests:", requestsError.message);
      } else {
        console.log('Event requests statuses found:', requestsData?.map(r => `${r.id}: ${r.status}`));
        setEventRequests(requestsData as EventRequest[] || []);
      }
    }

    setLoading(false);
  }, [profile]);

  // Handle immediate removal from local state when booking is deleted
  const handleBookingRemove = useCallback((bookingId: string) => {
    console.log('Removing booking from local state:', bookingId);
    setDirectBookings(prev => {
      const filtered = prev.filter(booking => booking.id !== bookingId);
      console.log('Bookings after removal:', filtered.length);
      return filtered;
    });
  }, []);

  const handleEventRequestRemove = useCallback((requestId: string) => {
    console.log('Removing event request from local state:', requestId);
    setEventRequests(prev => {
      const filtered = prev.filter(request => request.id !== requestId);
      console.log('Event requests after removal:', filtered.length);
      return filtered;
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Enable realtime updates for bookings and event requests
  useRealtimeBookings(fetchData);
  useRealtimeEventRequests(fetchData);

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
                        {directBookings.length > 0
                            ? directBookings.map((b) => {
                                // Blur contact details for ALL pending bookings when non-pro talent has reached limit
                const shouldBlurContact = !isProUser && 
                    receivedBookingsThisMonth >= 1 && 
                    b.status === 'pending';
                                
                                return (
                        <BookingCard 
                            key={b.id} 
                            booking={b} 
                            mode="talent" 
                            onUpdate={fetchData} 
                            onRemove={handleBookingRemove}
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
                                    onRemove={handleEventRequestRemove}
                                />
                              ))
                            : <p className="text-muted-foreground text-center py-8">No event requests match your location at this time.</p>}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};