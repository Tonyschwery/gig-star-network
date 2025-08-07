// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "@/components/BookingCard"; 
import { ChatModal } from "@/components/ChatModal";
import { GigOpportunitiesIntegrated } from '@/components/GigOpportunitiesIntegrated'; // For the Pro view

export const TalentDashboard = () => {
  const { user, profile } = useAuth(); // Assuming profile has isProSubscriber status
  const [directBookings, setDirectBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const fetchDirectBookings = async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from('bookings')
      .select(`*, payment:payments(*)`)
      .eq('talent_id', profile.id)
      .eq('is_gig_opportunity', false)
      .order('event_date', { ascending: false });

    if (error) console.error("Error fetching direct bookings:", error);
    else setDirectBookings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchDirectBookings();

    const channel = supabase.channel(`public:bookings:talent_id=eq.${profile?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchDirectBookings)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const handleOpenChat = async (bookingId: string, gigApplicationId?: string) => {
    const queryCol = gigApplicationId ? 'gig_application_id' : 'booking_id';
    const queryVal = gigApplicationId || bookingId;

    const { data, error } = await supabase.from('conversations').select('id').eq(queryCol, queryVal).single();
    if (data) {
      setCurrentConversationId(data.id);
      setIsChatOpen(true);
    } else {
      console.error("Could not find conversation", error);
    }
  };

  // *** BUG FIX: Corrected and simplified filtering logic for TALENT ***
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const newRequests = directBookings.filter(b => b.status === 'pending');
  const pendingApproval = directBookings.filter(b => b.status === 'pending_approval');
  const upcomingBookings = directBookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
  const pastBookings = directBookings.filter(b => new Date(b.event_date) < today);

  const renderBookings = (list: Booking[]) => (
    list.length > 0
      ? list.map(b => <BookingCard key={b.id} booking={b} mode="talent" onUpdate={fetchDirectBookings} isProSubscriber={profile?.is_pro_subscriber} onOpenChat={handleOpenChat} />)
      : <p className="text-muted-foreground text-center py-4">No bookings in this category.</p>
  );

  return (
    <>
      <Tabs defaultValue="new_requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new_requests">Direct Bookings</TabsTrigger>
          <TabsTrigger value="gigs">Gig Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="new_requests">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">New Requests ({newRequests.length})</TabsTrigger>
              <TabsTrigger value="pending_approval">Pending Approval ({pendingApproval.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming/Confirmed ({upcomingBookings.length})</TabsTrigger>
              <TabsTrigger value="past">Past Events ({pastBookings.length})</TabsTrigger>
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
                    {/* Add your <SubscriptionButton /> here */}
                </div>
            )}
        </TabsContent>
      </Tabs>
      
      {isChatOpen && currentConversationId && (
        <ChatModal conversationId={currentConversationId} onClose={() => setIsChatOpen(false)} />
      )}
    </>
  );
};