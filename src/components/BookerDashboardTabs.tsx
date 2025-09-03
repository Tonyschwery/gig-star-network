import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingCard, Booking } from "./BookingCard";
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { BookerNotificationBadge } from "./BookerNotificationBadge";
import { CalendarIcon, Clock, MapPin, User, Mail, FileText, MessageCircle, Phone } from 'lucide-react';
import { format } from 'date-fns';

interface EventRequest {
  id: string;
  user_id: string;
  booker_name: string;
  booker_email: string;
  booker_phone: string | null;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_type: string;
  description: string | null;
  status: 'pending' | 'approved' | 'declined' | 'completed';
  talent_type_needed: string | null;
  created_at: string;
  updated_at: string;
  admin_reply?: string | null;
  replied_at?: string | null;
}

export const BookerDashboardTabs = ({ userId }: { userId: string }) => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = useCallback(async () => {
        if (!userId) return;
        console.log('Fetching bookings for booker:', userId);
        
        const { data, error } = await supabase
            .from('bookings')
            .select(`*, talent_profiles(*)`)
            .eq('user_id', userId)
            .order('event_date', { ascending: false });
            
        if (error) {
            console.error("Error fetching bookings:", error);
        } else {
            console.log('Fetched bookings:', data?.length);
            setBookings(data || []);
        }
        setLoading(false);
    }, [userId]);

    const fetchEventRequests = useCallback(async () => {
        if (!userId) return;
        console.log('Fetching event requests for user:', userId);
        
        const { data, error } = await supabase
            .from('event_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error("Error fetching event requests:", error);
        } else {
            console.log('Fetched event requests:', data?.length);
            setEventRequests((data || []).map(item => ({
                ...item,
                status: item.status as EventRequest['status']
            })));
        }
    }, [userId]);

    // Use real-time hooks
    useRealtimeBookings(fetchBookings);
    useRealtimeNotifications();

    useEffect(() => {
        fetchBookings();
        fetchEventRequests();
    }, [fetchBookings, fetchEventRequests]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const awaitingResponse = bookings.filter(b => b.status === 'pending');
    const acceptedBookings = bookings.filter(b => b.status === 'accepted');
    const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= today);
    const pastBookings = bookings.filter(b => new Date(b.event_date) < today);

    const renderBookingList = (list: Booking[]) => (
        list.length > 0
            ? list.map(booking => (
                <div key={booking.id} className="mb-4">
                    <BookingCard booking={booking} mode="booker" onUpdate={fetchBookings} />
                </div>
            ))
            : <p className="text-muted-foreground text-center py-4">No bookings in this category.</p>
    );

    const getStatusBadge = (status: EventRequest['status']) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Pending Review</Badge>;
            case 'approved':
                return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Approved</Badge>;
            case 'declined':
                return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Declined</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Completed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const renderEventRequestList = () => {
        if (eventRequests.length === 0) {
            return (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">No Event Requests Yet</h3>
                    <p className="text-sm text-muted-foreground text-center">
                        You haven't submitted any direct event requests yet.
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {eventRequests.map((request) => (
                    <Card key={request.id} className="overflow-hidden">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-3 mb-2">
                                        <span className="capitalize">{request.event_type} Event</span>
                                        {getStatusBadge(request.status)}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Submitted {format(new Date(request.created_at), 'MMMM dd, yyyy \'at\' h:mm a')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-muted-foreground">Request ID</div>
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                        {request.id.slice(0, 8)}
                                    </code>
                                </div>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                            {/* Event Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Date:</span>
                                        <span>{format(new Date(request.event_date), 'MMMM dd, yyyy')}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Duration:</span>
                                        <span>{request.event_duration} hours</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Location:</span>
                                        <span>{request.event_location}</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Contact:</span>
                                        <span>{request.booker_name}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Email:</span>
                                        <span>{request.booker_email}</span>
                                    </div>

                                    {request.booker_phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Phone:</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {request.booker_phone}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            {request.description && (
                                <div className="border-t pt-3">
                                    <h4 className="font-medium mb-2 text-sm">Event Description</h4>
                                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                                        {request.description}
                                    </p>
                                </div>
                            )}

                            {/* Talent Type */}
                            {request.talent_type_needed && (
                                <div className="border-t pt-3">
                                    <h4 className="font-medium mb-2 text-sm">Talent Type Needed</h4>
                                    <Badge variant="outline" className="text-xs">
                                        {request.talent_type_needed}
                                    </Badge>
                                </div>
                            )}

                            {/* Admin Reply */}
                            {request.admin_reply ? (
                                <div className="border-t pt-3">
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MessageCircle className="h-4 w-4 text-green-600" />
                                            <h4 className="font-medium text-green-800 text-sm">Response from QTalents Team</h4>
                                        </div>
                                        <p className="text-green-700 text-sm mb-2">
                                            {request.admin_reply}
                                        </p>
                                        {request.replied_at && (
                                            <p className="text-xs text-green-600">
                                                Replied on {format(new Date(request.replied_at), 'MMMM dd, yyyy \'at\' h:mm a')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : request.status === 'pending' ? (
                                <div className="border-t pt-3">
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="h-4 w-4 text-yellow-600" />
                                            <h4 className="font-medium text-yellow-800 text-sm">Waiting for Response</h4>
                                        </div>
                                        <p className="text-yellow-700 text-sm">
                                            Our team is reviewing your event request. We'll respond within 24-48 hours with talent recommendations and next steps.
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };


    if (loading) return <div>Loading...</div>;

    return (
        <>
            {/* Notification Badge */}
            <BookerNotificationBadge />
            
            <Tabs defaultValue="awaiting_response" className="w-full">
                <TabsList className="grid w-full grid-cols-5 gap-1 h-auto p-1">
                    <TabsTrigger value="event_requests" className="text-xs sm:text-sm px-1 sm:px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Event Requests</span>
                        <span className="sm:hidden">Events</span>
                        <span className="ml-1">({eventRequests.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="awaiting_response" className="text-xs sm:text-sm px-1 sm:px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Awaiting Response</span>
                        <span className="sm:hidden">Awaiting</span>
                        <span className="ml-1">({awaitingResponse.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="accepted" className="text-xs sm:text-sm px-1 sm:px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Accepted</span>
                        <span className="sm:hidden">Accepted</span>
                        <span className="ml-1">({acceptedBookings.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="upcoming" className="text-xs sm:text-sm px-1 sm:px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Upcoming</span>
                        <span className="sm:hidden">Future</span>
                        <span className="ml-1">({upcomingBookings.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="past" className="text-xs sm:text-sm px-1 sm:px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Past Events</span>
                        <span className="sm:hidden">Past</span>
                        <span className="ml-1">({pastBookings.length})</span>
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="event_requests">{renderEventRequestList()}</TabsContent>
                <TabsContent value="awaiting_response">{renderBookingList(awaitingResponse)}</TabsContent>
                <TabsContent value="accepted">{renderBookingList(acceptedBookings)}</TabsContent>
                <TabsContent value="upcoming">{renderBookingList(upcomingBookings)}</TabsContent>
                <TabsContent value="past">{renderBookingList(pastBookings)}</TabsContent>
            </Tabs>
        </>
    );
};