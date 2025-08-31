import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";

export const TalentDashboardTabs = () => {
    const { user } = useAuth();
    const [talentProfile, setTalentProfile] = useState<any>(null);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAllBookings = useCallback(async () => {
        if (!user?.id) return;
        // Ensure we have the talent profile
        let profileId = talentProfile?.id as string | undefined;
        if (!profileId) {
            const { data: tp, error: tpError } = await supabase
                .from('talent_profiles')
                .select('id,is_pro_subscriber')
                .eq('user_id', user.id)
                .maybeSingle();
            if (tpError) console.error("Error fetching talent profile:", tpError);
            if (!tp) { setLoading(false); return; }
            setTalentProfile(tp);
            profileId = tp.id;
        }
        const { data, error } = await supabase
            .from('bookings')
            .select(`*`)
            .eq('talent_id', profileId)
            .order('event_date', { ascending: false });

        if (error) console.error("Error fetching bookings:", error);
        else setAllBookings(data || []);
        setLoading(false);
    }, [user, talentProfile]);

    useEffect(() => {
        fetchAllBookings();
        // Setup a single channel to listen for all changes related to this talent
        const channel = supabase.channel(`talent-dashboard:${talentProfile?.id || user?.id || 'unknown'}`).on('postgres_changes', { event: '*', schema: 'public' }, fetchAllBookings).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [talentProfile, user, fetchAllBookings]);


    if (loading) return <div>Loading...</div>;
    
    // Filter bookings for Direct Bookings tabs
    const directBookings = allBookings; // All bookings are now direct bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newRequests = directBookings.filter(b => b.status === 'pending');
    const acceptedBookings = directBookings.filter(b => b.status === 'accepted');
    const upcomingBookings = directBookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
    const pastBookings = directBookings.filter(b => ['confirmed', 'accepted', 'pending'].includes(b.status) && new Date(b.event_date) < today);

    const renderBookings = (list: Booking[]) => (
        list.length > 0
            ? list.map(b => <BookingCard key={b.id} booking={b} mode="talent" onUpdate={fetchAllBookings} isProSubscriber={talentProfile?.is_pro_subscriber} />)
            : <p className="text-muted-foreground text-center py-4">No bookings in this category.</p>
    );

    return (
        <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending">New ({newRequests.length})</TabsTrigger>
                <TabsTrigger value="accepted">Accepted ({acceptedBookings.length})</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
                <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">{renderBookings(newRequests)}</TabsContent>
            <TabsContent value="accepted">{renderBookings(acceptedBookings)}</TabsContent>
            <TabsContent value="upcoming">{renderBookings(upcomingBookings)}</TabsContent>
            <TabsContent value="past">{renderBookings(pastBookings)}</TabsContent>
        </Tabs>
    );
};

export default TalentDashboardTabs;