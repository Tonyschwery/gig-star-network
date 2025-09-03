import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard";
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { BookerNotificationBadge } from "./BookerNotificationBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Clock, MapPin, User, Mail, FileText, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface EventRequest {
  id: string;
  user_id: string;
  booker_name: string;
  booker_email: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_type: string;
  description: string | null;
  status: 'pending' | 'approved' | 'declined' | 'completed';
  created_at: string;
  updated_at: string;
  admin_reply?: string | null;
  replied_at?: string | null;
}

export const BookerDashboardTabs = ({ userId }: { userId: string }) => {
    const navigate = useNavigate();
    const { toast } = useToast();
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

    // Use real-time hooks
    useRealtimeBookings(fetchBookings);
    useRealtimeNotifications();

    const fetchEventRequests = useCallback(async () => {
        if (!userId) return;
        
        try {
            const { data, error } = await supabase
                .from('event_requests')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setEventRequests((data || []).map(item => ({
                ...item,
                status: item.status as EventRequest['status']
            })));
        } catch (error) {
            console.error('Error loading event requests:', error);
            toast({
                title: "Error",
                description: "Failed to load your event requests",
                variant: "destructive",
            });
        }
    }, [userId, toast]);

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

    const renderEventRequestsList = () => {
        if (eventRequests.length === 0) {
            return (
                <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No Event Requests Yet</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        Haven't found the perfect talent? Submit a direct request and let our team help you find the right fit!
                    </p>
                    <Button onClick={() => navigate('/your-event')} className="bg-primary hover:bg-primary/90">
                        Submit Event Request
                    </Button>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
                            <div className="text-2xl font-bold">{eventRequests.length}</div>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
                            <div className="text-2xl font-bold">{eventRequests.filter(r => r.status === 'pending').length}</div>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">With Replies</CardTitle>
                            <div className="text-2xl font-bold">{eventRequests.filter(r => r.admin_reply).length}</div>
                        </CardHeader>
                    </Card>
                </div>

                {/* Event Requests List */}
                {eventRequests.map((request) => (
                    <Card key={request.id} className="overflow-hidden">
                        <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <CalendarIcon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg capitalize">{request.event_type} Event</CardTitle>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span>Submitted {format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                                            <span>ID: {request.id.slice(-8)}</span>
                                        </div>
                                    </div>
                                </div>
                                {getStatusBadge(request.status)}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{format(new Date(request.event_date), 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{request.event_duration} hours</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{request.event_location}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{request.booker_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{request.booker_email}</span>
                                </div>
                            </div>

                            {request.description && (
                                <div>
                                    <h4 className="font-medium mb-2">Event Description</h4>
                                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                        {request.description}
                                    </p>
                                </div>
                            )}

                            {request.admin_reply ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageCircle className="h-4 w-4 text-green-600" />
                                        <h4 className="font-medium text-green-800">QTalents Response</h4>
                                        {request.replied_at && (
                                            <span className="text-xs text-green-600">
                                                {format(new Date(request.replied_at), 'MMM d, yyyy')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-green-700 leading-relaxed">{request.admin_reply}</p>
                                </div>
                            ) : request.status === 'pending' ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="h-4 w-4 text-yellow-600" />
                                        <h4 className="font-medium text-yellow-800">Awaiting Review</h4>
                                    </div>
                                    <p className="text-sm text-yellow-700">
                                        Our team is reviewing your request. We'll get back to you shortly!
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FileText className="h-4 w-4 text-blue-600" />
                                        <h4 className="font-medium text-blue-800">Request Processed</h4>
                                    </div>
                                    <p className="text-sm text-blue-700">
                                        Your request has been processed. Check back for updates!
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {/* Call to Action */}
                <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Need Another Event?</h3>
                    <p className="text-muted-foreground mb-4">Submit another request and we'll help you find the perfect talent.</p>
                    <Button onClick={() => navigate('/your-event')} variant="outline">
                        Submit New Request
                    </Button>
                </div>
            </div>
        );
    };

    if (loading) return <div>Loading...</div>;

    return (
        <>
            {/* Notification Badge */}
            <BookerNotificationBadge />
            
            <Tabs defaultValue="awaiting_response" className="w-full">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-1 h-auto p-1">
                    <TabsTrigger value="awaiting_response" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Awaiting Response</span>
                        <span className="sm:hidden">Awaiting</span>
                        <span className="ml-1">({awaitingResponse.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="accepted" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Accepted</span>
                        <span className="sm:hidden">Accepted</span>
                        <span className="ml-1">({acceptedBookings.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="upcoming" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Upcoming</span>
                        <span className="sm:hidden">Future</span>
                        <span className="ml-1">({upcomingBookings.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="past" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Past Events</span>
                        <span className="sm:hidden">Past</span>
                        <span className="ml-1">({pastBookings.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="event_requests" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <span className="hidden sm:inline">Event Requests</span>
                        <span className="sm:hidden">Requests</span>
                        <span className="ml-1">({eventRequests.length})</span>
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="awaiting_response">{renderBookingList(awaitingResponse)}</TabsContent>
                <TabsContent value="accepted">{renderBookingList(acceptedBookings)}</TabsContent>
                <TabsContent value="upcoming">{renderBookingList(upcomingBookings)}</TabsContent>
                <TabsContent value="past">{renderBookingList(pastBookings)}</TabsContent>
                <TabsContent value="event_requests">{renderEventRequestsList()}</TabsContent>
            </Tabs>
        </>
    );
};