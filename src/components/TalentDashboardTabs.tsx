// PASTE THIS ENTIRE CODE BLOCK. THIS IS THE FINAL VERSION.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";
import { ChatModal } from "./ChatModal";
import { GigOpportunitiesIntegrated } from './GigOpportunitiesIntegrated';
import { Button } from "./ui/button";
import { Calendar, Sparkles } from "lucide-react";
import { UniversalChatWidget } from "@/components/UniversalChatWidget";

export const TalentDashboardTabs = () => {
    const { user, profile } = useAuth(); // Use the profile from your global auth hook
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDirectBookings = useCallback(async () => {
        // We use the profile.id which is the talent_profiles.id
        if (!profile?.id) {
            setLoading(false);
            return;
        }
        
        const { data, error } = await supabase
            .from('bookings')
            .select(`*, payments(*), gig_applications(id)`)
            .eq('talent_id', profile.id)
            .eq('is_gig_opportunity', false)
            .order('event_date', { ascending: false });

        if (error) {
            console.error("Error fetching direct bookings:", error);
        } else {
            setDirectBookings(data || []);
        }
        setLoading(false);
    }, [profile]);

    useEffect(() => {
        fetchDirectBookings();
        // Set up real-time subscription
        const channel = supabase.channel(`public:bookings:talent_id=eq.${profile?.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchDirectBookings)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [profile, fetchDirectBookings]);

    if (loading) return <div>Loading Talent Dashboard...</div>;
    
    // Filtering logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newRequests = directBookings.filter(b => b.status === 'pending');
    const pendingApproval = directBookings.filter(b => b.status === 'pending_approval');
    const upcomingBookings = directBookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
    const pastBookings = directBookings.filter(b => new Date(b.event_date) < today);

    // *** BUG FIX: The onOpenChat prop was missing from the BookingCard call ***
    const renderBookings = (list: Booking[]) => (
        list.length > 0
            ? list.map(b => 
                <BookingCard 
                    key={b.id} 
                    booking={b} 
                    mode="talent" 
                    onUpdate={fetchDirectBookings} 
                    isProSubscriber={profile?.is_pro_subscriber}
                    // The handleOpenChat function from the Universal Chat Widget will be used.
                    // This component no longer needs its own chat state.
                />
            )
            : <p className="text-muted-foreground text-center py-4">No bookings in this category.</p>
    );

    return (
        <>
            <Tabs defaultValue="bookings" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="bookings">Direct Bookings</TabsTrigger>
                    <TabsTrigger value="gigs">Gig Opportunities</TabsTrigger>
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
                    {profile?.is_pro_subscriber ? (
                        <GigOpportunitiesIntegrated />
                    ) : (
                        <div className="text-center p-8 border rounded-lg">
                            <h3 className="font-bold">This is a Pro Feature</h3>
                            <p>Upgrade to Pro to view and apply for exclusive gig opportunities.</p>
                            <Button>Upgrade to Pro</Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
            
            {/* The Universal Chat Widget handles all chat functionality */}
            <UniversalChatWidget />
        </>
    );
};

export default TalentDashboardTabs;