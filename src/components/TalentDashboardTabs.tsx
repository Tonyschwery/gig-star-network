import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";
import { GigOpportunitiesIntegrated } from './GigOpportunitiesIntegrated';
import { Button } from "./ui/button";
import UniversalChatWidget from './UniversalChatWidget';

export const TalentDashboardTabs = () => {
    const { user } = useAuth();
    const [talentProfile, setTalentProfile] = useState<any>(null);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAllBookings = useCallback(async () => {
        if (!user?.id) return;
        
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
            .select(`*, payments(*)`)
            .eq('talent_id', profileId);

        if (error) console.error("Error fetching bookings:", error);
        else setAllBookings(data || []);
        setLoading(false);
    }, [user, talentProfile]);

    useEffect(() => {
        fetchAllBookings();
        const channel = supabase.channel(`talent-dashboard:${talentProfile?.id || user?.id || 'unknown'}`).on('postgres_changes', { event: '*', schema: 'public' }, fetchAllBookings).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [talentProfile, user, fetchAllBookings]);

    if (loading) return <div>Loading...</div>;
    
    const directBookings = allBookings.filter(b => !b.is_gig_opportunity);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newRequests = directBookings.filter(b => b.status === 'pending');
    const pendingApproval = directBookings.filter(b => b.status === 'pending_approval');
    const upcomingBookings = directBookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
    const pastBookings = directBookings.filter(b => new Date(b.event_date) < today);

    const renderBookings = (list: Booking[]) => (
        list.length > 0
            ? list.map(b => <BookingCard key={b.id} booking={b} mode="talent" onUpdate={fetchAllBookings} isProSubscriber={talentProfile?.is_pro_subscriber} />)
            : <p className="text-muted-foreground text-center py-4">No bookings in this category.</p>
    );

    return (
        <Tabs defaultValue="bookings" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bookings">Direct Bookings</TabsTrigger>
                <TabsTrigger value="gigs">Gig Opportunities</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings">
                <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="pending">New ({newRequests.length})</TabsTrigger>
                        <TabsTrigger value="pending_approval">Pending ({pendingApproval.length})</TabsTrigger>
                        <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
                        <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending">{renderBookings(newRequests)}</TabsContent>
                    <TabsContent value="pending_approval">{renderBookings(pendingApproval)}</TabsContent>
                    <TabsContent value="upcoming">{renderBookings(upcomingBookings)}</TabsContent>
                    <TabsContent value="past">{renderBookings(pastBookings)}</TabsContent>
                </Tabs>
            </TabsContent>
            
            <TabsContent value="gigs">
                {talentProfile?.is_pro_subscriber ? (
                    <GigOpportunitiesIntegrated 
                        isProSubscriber={!!talentProfile?.is_pro_subscriber}
                        onUpgrade={() => {}}
                        talentId={talentProfile?.id || ''}
                    />
                ) : (
                    <div className="text-center p-8 border rounded-lg">
                        <h3 className="font-bold">This is a Pro Feature</h3>
                        <p>Upgrade to Pro to view and apply for exclusive gig opportunities.</p>
                        <Button>Upgrade to Pro</Button>
                    </div>
                )}
            </TabsContent>

            <TabsContent value="messages">
                <UniversalChatWidget />
            </TabsContent>
      </Tabs>
    );
};

export default TalentDashboardTabs;
