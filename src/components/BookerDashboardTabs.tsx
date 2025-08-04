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
import { BookingCard } from "@/components/BookingCard";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

interface Booking {
  id: string;
  booker_name: string;
  booker_email?: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_address: string;
  event_type: string;
  description?: string;
  status: string;
  created_at: string;
  user_id: string;
  talent_id?: string;
  is_gig_opportunity?: boolean;
  is_public_request?: boolean;
  payment_id?: string;
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
  const [activeTab, setActiveTab] = useState("awaiting");
  const [hasViewedTab, setHasViewedTab] = useState<Record<string, boolean>>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingPayments, setBookingPayments] = useState<Record<string, any>>({});
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatBooking, setChatBooking] = useState<Booking | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // MASTER TASK 2: Unified booking list - fetch both direct bookings and gigs
  const fetchUnifiedBookings = async () => {
    try {
      // Fetch both direct bookings and gig bookings in one call
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
        .neq('status', 'declined')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
      
      // Fetch payment details for approved and pending_approval bookings
      const approvedBookingIds = (data || [])
        .filter(booking => (booking.status === 'approved' || booking.status === 'pending_approval') && booking.payment_id)
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
      console.error('Error fetching unified bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load your bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnifiedBookings();
    
    // TASK 2: Real-time subscription for booking updates (including pending_approval status)
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
        (payload) => {
          console.log('Booking updated for booker:', userId, payload);
          // Check if status changed to pending_approval
          if (payload.new?.status === 'pending_approval') {
            console.log('Booking moved to pending_approval, triggering notification');
            // Trigger global notification (handled by NotificationCenter real-time)
          }
          // Refresh bookings when status changes
          fetchUnifiedBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
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

  // MASTER TASK 1: Fix booking status logic - filter by event_date, not payment status
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  const awaitingBookings = bookings.filter(booking => booking.status === 'pending');
  const pendingApprovalBookings = bookings.filter(booking => booking.status === 'pending_approval');
  // MASTER TASK 1: Fix post-payment booking logic - only show 'confirmed' status in upcoming
  const upcomingBookings = bookings.filter(booking => 
    booking.status === 'confirmed' && 
    new Date(booking.event_date) >= today
  );
  // MASTER TASK 1: Past events should only show bookings where event_date is in the past, regardless of status
  const pastBookings = bookings.filter(booking => 
    new Date(booking.event_date) < today
  );

  const renderBookingCard = (booking: Booking, showPaymentInterface: boolean = false) => {
    const payment = bookingPayments[booking.id];
    
    return (
      <BookingCard
        key={booking.id}
        booking={booking}
        mode="booker"
        showActions={false}
        showPaymentInterface={showPaymentInterface && !!payment}
        payment={payment}
        onUpdate={fetchUnifiedBookings}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {/* MASTER TASK 2: Unified Dashboard - No more separate tabs */}
        <Tabs value={activeTab} onValueChange={(tab) => {
          setActiveTab(tab);
          setHasViewedTab(prev => ({ ...prev, [tab]: true }));
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="awaiting" className="flex items-center gap-2 relative">
              <Clock3 className="h-4 w-4" />
              <span className="hidden sm:inline">Awaiting Response</span>
              <span className="sm:hidden">Awaiting</span>
              {awaitingBookings.length > 0 && !hasViewedTab.awaiting && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {awaitingBookings.length > 99 ? '99+' : awaitingBookings.length}
                  </span>
                </div>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2 relative">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Invoices / Awaiting Payment</span>
              <span className="sm:hidden">Invoices</span>
              {pendingApprovalBookings.length > 0 && !hasViewedTab.pending && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {pendingApprovalBookings.length > 99 ? '99+' : pendingApprovalBookings.length}
                  </span>
                </div>
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
        
        <TabsContent value="pending">
          <Card className="glass-card border-orange-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <AlertCircle className="h-5 w-5 mr-2" />
                Invoices / Awaiting Payment ({pendingApprovalBookings.length})
              </CardTitle>
              <CardDescription>
                Invoices sent by talents awaiting your approval and payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingApprovalBookings.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Invoices / Awaiting Payment</h3>
                  <p className="text-sm text-muted-foreground">
                    Invoices from talents will appear here for your review and payment
                  </p>
                </div>
              ) : (
                pendingApprovalBookings.map((booking) => renderBookingCard(booking, true))
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