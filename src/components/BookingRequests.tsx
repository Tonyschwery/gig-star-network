import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";
import { UniversalChat } from "@/components/UniversalChat";
import { useTalentBookingLimit } from "@/hooks/useTalentBookingLimit";
import { NotificationBadge } from "./NotificationBadge";

interface BookingRequestsProps {
    talentId: string;
    isProSubscriber?: boolean;
}

export const BookingRequests = ({ talentId, isProSubscriber }: BookingRequestsProps) => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [chatOpenBooking, setChatOpenBooking] = useState<string | undefined>();
    const { acceptedBookingsThisMonth, canAcceptBooking, isProUser } = useTalentBookingLimit();

    // Clear chatOpenBooking after it's been processed
    useEffect(() => {
        if (chatOpenBooking) {
            const timer = setTimeout(() => setChatOpenBooking(undefined), 150);
            return () => clearTimeout(timer);
        }
    }, [chatOpenBooking]);

    const fetchBookings = useCallback(async () => {
        if (!talentId) return;
        const { data, error } = await supabase.from('bookings').select(`*`).eq('talent_id', talentId).eq('is_gig_opportunity', false).order('event_date', { ascending: false });
        if (error) console.error("Error fetching direct bookings:", error);
        else setBookings(data || []);
        setLoading(false);
    }, [talentId]);

    useEffect(() => {
        fetchBookings();
        const channel = supabase.channel(`public:bookings:talent_id=eq.${talentId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [talentId, fetchBookings]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newRequests = bookings.filter(b => b.status === 'pending');
    const pendingApproval = bookings.filter(b => b.status === 'pending_approval');
    const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
    const pastBookings = bookings.filter(b => new Date(b.event_date) < today);

    const renderBookings = (bookingsList: Booking[], allowAccept = true) => {
        if (bookingsList.length === 0) {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No bookings in this category</p>
                </div>
            );
        }
        
        return bookingsList.map((booking) => (
            <BookingCard 
                key={booking.id} 
                booking={booking} 
                mode="talent" 
                onUpdate={fetchBookings}
                isProSubscriber={isProSubscriber}
                canAccept={allowAccept}
                onChatOpen={(bookingId) => setChatOpenBooking(bookingId)}
            />
        ));
    };

    if (loading) return <div className="animate-pulse h-32 bg-muted rounded"></div>;

    return (
        <div className="space-y-6">
            {/* Notification Badge */}
            <div className="flex justify-center">
                <NotificationBadge />
            </div>
            
            {/* Booking limit display for non-pro talents */}
            {!isProUser && (
                <div className="p-3 bg-muted rounded-lg border">
                    <p className="text-sm text-muted-foreground">
                        <strong>Free Plan:</strong> {acceptedBookingsThisMonth}/1 bookings accepted this month
                        {!canAcceptBooking && (
                            <span className="text-destructive font-medium"> - Upgrade to Pro for unlimited bookings!</span>
                        )}
                    </p>
                </div>
            )}
            
            <Tabs defaultValue="new" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="new">New ({newRequests.length})</TabsTrigger>
                    <TabsTrigger value="pending_approval">Pending ({pendingApproval.length})</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
                    <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="new" className="space-y-4">
                    {renderBookings(newRequests, canAcceptBooking)}
                </TabsContent>
                <TabsContent value="pending_approval" className="space-y-4">
                    {renderBookings(pendingApproval)}
                </TabsContent>
                <TabsContent value="upcoming" className="space-y-4">
                    {renderBookings(upcomingBookings)}
                </TabsContent>
                <TabsContent value="past" className="space-y-4">
                    {renderBookings(pastBookings)}
                </TabsContent>
            </Tabs>
            
            
    );
};