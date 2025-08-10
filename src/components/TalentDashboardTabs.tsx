// PASTE THIS ENTIRE CODE BLOCK. THIS IS THE FINAL VERSION.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";
import { GigOpportunitiesIntegrated } from './GigOpportunitiesIntegrated';
import { Button } from "./ui/button";
import { Calendar, Sparkles } from "lucide-react";
import { UniversalChatWidget } from "@/components/UniversalChatWidget";
import { ChatModal } from './ChatModal'; // Make sure ChatModal is imported

export const TalentDashboardTabs = () => {
    const { user } = useAuth();
    const [talentProfile, setTalentProfile] = useState<any>(null);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    // *** BUG FIX START: Add state management for the chat modal ***
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    // *** BUG FIX END ***

    const fetchAllBookings = useCallback(async () => {
        if (!user?.id) { setLoading(false); return; }
        
        let profileId = talentProfile?.id;
        if (!profileId) {
            const { data: tp } = await supabase.from('talent_profiles').select('id, is_pro_subscriber').eq('user_id', user.id).maybeSingle();
            if (!tp) { setLoading(false); return; }
            setTalentProfile(tp);
            profileId = tp.id;
        }

        const { data, error } = await supabase.from('bookings').select(`*, payments(*), gig_applications(id)`).eq('talent_id', profileId);
        if (error) console.error("Error fetching bookings:", error);
        else setAllBookings(data || []);
        setLoading(false);
    }, [user, talentProfile]);

    useEffect(() => {
        fetchAllBookings();
        const channel = supabase.channel(`talent-dashboard:${talentProfile?.id || user?.id}`).on('postgres_changes', { event: '*', schema: 'public' }, fetchAllBookings).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user, fetchAllBookings]);

    // *** BUG FIX START: Add the handler function to open the chat ***
    const handleOpenChat = async (bookingId: string, gigApplicationId?: string) => {
        const isGig = !!gigApplicationId;
        const queryCol = isGig ? 'gig_application_id' : 'booking_id';
        const queryVal = isGig ? gigApplicationId : bookingId;

        const { data: convo } = await supabase.from('conversations').select('id').eq(queryCol, queryVal).maybeSingle();
        if (convo) {
            setActiveConversationId(convo.id);
            setIsChatOpen(true);
        } else {
            const insertData = { booking_id: bookingId, ...(isGig && { gig_application_id: gigApplicationId }) };
            const { data: newConvo } = await supabase.from('conversations').insert(insertData).select().single();
            if (newConvo) {
                setActiveConversationId(newConvo.id);
                setIsChatOpen(true);
            }
        }
    };
    // *** BUG FIX END ***

    if (loading) return <div>Loading...</div>;
    
    const directBookings = allBookings.filter(b => !b.is_gig_opportunity);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newRequests = directBookings.filter(b => b.status === 'pending');
    const pendingApproval = directBookings.filter(b => b.status === 'pending_approval');
    const upcomingBookings = directBookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
    const pastBookings = directBookings.filter(b => new Date(b.event_date) < today);

    // *** BUG FIX: Pass the handleOpenChat function to the BookingCard ***
    const renderBookings = (list: Booking[]) => (
        list.length > 0
            ? list.map(b => <BookingCard key={b.id} booking={b} mode="talent" onUpdate={fetchAllBookings} isProSubscriber={talentProfile?.is_pro_subscriber} onOpenChat={handleOpenChat} />)
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
                    {talentProfile?.is_pro_subscriber ? (
                        <GigOpportunitiesIntegrated onOpenChat={handleOpenChat} />
                    ) : (
                        <div className="text-center p-8 border rounded-lg">
                            <h3 className="font-bold">This is a Pro Feature</h3>
                            <p>Upgrade to Pro to view and apply for exclusive gig opportunities.</p>
                            <Button>Upgrade to Pro</Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
            
            {/* Renders the chat modal when isChatOpen is true */}
            {isChatOpen && activeConversationId && (
                <ChatModal conversationId={activeConversationId} open={isChatOpen} onOpenChange={setIsChatOpen} />
            )}
            
            {/* The UniversalChatWidget is separate and can be kept if you want the floating icon */}
            <UniversalChatWidget />
        </>
    );
};

export default TalentDashboardTabs;