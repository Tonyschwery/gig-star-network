import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Mail, 
  User, 
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock3,
  AlertCircle,
  CreditCard,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BookerInvoiceCard } from "@/components/BookerInvoiceCard";
import { ChatModal } from "@/components/ChatModal";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { BookerGigDashboard } from "@/components/BookerGigDashboard";

interface Booking {
  id: string;
  booker_name: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_address: string;
  event_type: string;
  description?: string;
  status: string;
  created_at: string;
  talent_id: string;
  talent_profiles?: {
    artist_name: string;
    picture_url?: string;
    rate_per_hour: number;
    is_pro_subscriber: boolean;
  };
}

interface BookerDashboardTabsProps {
  userId: string;
}

export const BookerDashboardTabs = ({ userId }: BookerDashboardTabsProps) => {
  const [activeMainTab, setActiveMainTab] = useState("bookings");
  const [activeTab, setActiveTab] = useState("awaiting");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingPayments, setBookingPayments] = useState<Record<string, any>>({});
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatBooking, setChatBooking] = useState<Booking | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
    
    // Set up real-time subscription for booking updates
    const channel = supabase
      .channel('booker-booking-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Refresh bookings when status changes
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          talent_profiles (
            artist_name,
            picture_url,
            rate_per_hour,
            is_pro_subscriber
          )
        `)
        .eq('user_id', userId)
        .neq('status', 'declined') // Hide declined bookings
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
      
      // Fetch payment details for approved bookings
      const approvedBookingIds = (data || [])
        .filter(booking => booking.status === 'approved' && booking.payment_id)
        .map(booking => booking.payment_id);
        
      if (approvedBookingIds.length > 0) {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .in('id', approvedBookingIds);
          
        if (!paymentsError && payments) {
          const paymentsMap = payments.reduce((acc, payment) => {
            acc[payment.booking_id] = payment;
            return acc;
          }, {} as Record<string, any>);
          setBookingPayments(paymentsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load your bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/20';
      case 'approved':
        return 'bg-green-500/20 text-green-700 border-green-500/20';
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/20';
      case 'completed':
        return 'bg-purple-500/20 text-purple-700 border-purple-500/20';
      default:
        return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock3 className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock3 className="h-4 w-4" />;
    }
  };

  const getEventTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      wedding: "💒",
      birthday: "🎂",
      corporate: "🏢",
      opening: "🎪",
      club: "🎵",
      school: "🏫",
      festival: "🎉"
    };
    return icons[type] || "🎵";
  };

  const handleOpenChat = (booking: Booking) => {
    setChatBooking(booking);
    setShowChatModal(true);
  };

  // Chat Button Component with unread indicator
  const ChatButton = ({ booking, variant = "outline", size = "sm" }: { booking: Booking, variant?: any, size?: any }) => {
    const { hasUnread } = useUnreadMessages(booking.id);
    const { unreadCount } = useUnreadNotifications();
    
    return (
      <Button
        onClick={() => handleOpenChat(booking)}
        variant={variant}
        size={size}
        className="relative flex-shrink-0"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Chat</span>
        <span className="sm:hidden">Chat</span>
        {(hasUnread || unreadCount > 0) && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </div>
        )}
      </Button>
    );
  };

  // Filter bookings by status and date
  const awaitingBookings = bookings.filter(booking => booking.status === 'pending');
  const actionRequiredBookings = bookings.filter(booking => booking.status === 'approved');
  const upcomingBookings = bookings.filter(booking => 
    booking.status === 'confirmed' && new Date(booking.event_date) >= new Date()
  );
  const pastBookings = bookings.filter(booking => 
    booking.status === 'completed' || 
    (new Date(booking.event_date) < new Date() && booking.status !== 'pending' && booking.status !== 'approved')
  );

  const renderBookingCard = (booking: Booking, showPaymentInterface: boolean = false) => (
    <div key={booking.id} className="border rounded-lg p-4 bg-card space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getEventTypeIcon(booking.event_type)}</span>
            <h3 className="font-semibold capitalize">
              {booking.event_type} Event
            </h3>
            <Badge className={getStatusColor(booking.status)}>
              {getStatusIcon(booking.status)}
              <span className="ml-1">{booking.status}</span>
            </Badge>
          </div>
          
          {booking.talent_profiles && (
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Talent: {booking.talent_profiles.artist_name}
              </div>
              {booking.status === 'approved' && (
                <div className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Approved! Payment required to confirm booking.
                </div>
              )}
              {booking.status === 'confirmed' && (
                <div className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Confirmed and paid!
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(booking.event_date), 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{booking.event_duration} hours</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{booking.event_location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Created {format(new Date(booking.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium text-foreground">Full Address:</span>
              <p className="text-muted-foreground mt-1">{booking.event_address}</p>
            </div>
            {booking.description && (
              <div className="text-sm">
                <span className="font-medium text-foreground">Event Description:</span>
                <p className="text-muted-foreground mt-1">{booking.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat and View Talent Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <ChatButton booking={booking} variant="outline" size="sm" />
        {booking.talent_id && (
          <Button
            onClick={() => navigate(`/talent/${booking.talent_id}`)}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            <User className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">View Talent</span>
            <span className="sm:hidden">Profile</span>
          </Button>
        )}
      </div>

      {/* Payment Interface for approved bookings */}
      {showPaymentInterface && bookingPayments[booking.id] && (
        <div className="mt-4 pt-4 border-t">
          <BookerInvoiceCard
            booking={booking}
            payment={bookingPayments[booking.id]}
            onPaymentUpdate={fetchBookings}
          />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {/* MASTER TASK 3: Main Tab Selection - Bookings vs Gigs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeMainTab === 'bookings' ? 'default' : 'outline'}
            onClick={() => setActiveMainTab('bookings')}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Direct Bookings
          </Button>
          <Button
            variant={activeMainTab === 'gigs' ? 'default' : 'outline'}
            onClick={() => setActiveMainTab('gigs')}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Gig Opportunities
          </Button>
        </div>
      </div>

      {/* MASTER TASK 3: Show appropriate dashboard based on selection */}
      {activeMainTab === 'gigs' ? (
        <BookerGigDashboard userId={userId} />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="awaiting" className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              <span className="hidden sm:inline">Awaiting Response</span>
              <span className="sm:hidden">Awaiting</span>
              {awaitingBookings.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {awaitingBookings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="action" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Action Required</span>
              <span className="sm:hidden">Action</span>
              {actionRequiredBookings.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {actionRequiredBookings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Upcoming</span>
              <span className="sm:hidden">Upcoming</span>
              {upcomingBookings.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {upcomingBookings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Past Events</span>
              <span className="sm:hidden">Past</span>
              {pastBookings.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pastBookings.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        
        <TabsContent value="awaiting">
          <Card className="glass-card border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-700">
                <Clock3 className="h-5 w-5 mr-2" />
                Awaiting Response ({awaitingBookings.length})
              </CardTitle>
              <CardDescription>
                Your booking requests that are pending talent approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {awaitingBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Clock3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Pending Requests</h3>
                  <p className="text-sm text-muted-foreground">
                    Your booking requests awaiting talent approval will appear here
                  </p>
                </div>
              ) : (
                awaitingBookings.map((booking) => renderBookingCard(booking))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="action">
          <Card className="glass-card border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <AlertCircle className="h-5 w-5 mr-2" />
                Action Required ({actionRequiredBookings.length})
              </CardTitle>
              <CardDescription>
                Approved bookings that require payment to confirm
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {actionRequiredBookings.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Payments Required</h3>
                  <p className="text-sm text-muted-foreground">
                    Approved bookings requiring payment will appear here
                  </p>
                </div>
              ) : (
                actionRequiredBookings.map((booking) => renderBookingCard(booking, true))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="upcoming">
          <Card className="glass-card border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-700">
                <CheckCircle className="h-5 w-5 mr-2" />
                Upcoming / Confirmed ({upcomingBookings.length})
              </CardTitle>
              <CardDescription>
                Your confirmed upcoming events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Upcoming Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Your confirmed upcoming events will appear here
                  </p>
                </div>
              ) : (
                upcomingBookings.map((booking) => renderBookingCard(booking))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="past">
          <Card className="glass-card border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-700">
                <Calendar className="h-5 w-5 mr-2" />
                Past Events ({pastBookings.length})
              </CardTitle>
              <CardDescription>
                Your completed events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pastBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Past Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Your completed events will appear here
                  </p>
                </div>
              ) : (
                pastBookings.map((booking) => renderBookingCard(booking))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      {/* Chat Modal */}
      {showChatModal && chatBooking && (
        <ChatModal
          open={showChatModal}
          onOpenChange={setShowChatModal}
          bookingId={chatBooking.id}
          talentName={chatBooking.talent_profiles?.artist_name || 'Talent'}
          eventType={chatBooking.event_type}
          eventDate={chatBooking.event_date}
        />
      )}
    </>
  );
};