import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, Mail, User, Check, X, MessageCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualInvoiceModal } from "./ManualInvoiceModal";
import { ChatModal } from "./ChatModal";
import { BookingCard } from "./BookingCard";
import { format } from "date-fns";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

interface Booking {
  id: string;
  booker_name: string;
  booker_email: string;
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
  budget?: number;
  budget_currency?: string;
}

interface BookingRequestsProps {
  talentId: string;
  isProSubscriber?: boolean;
}

// Chat Button Component with unread indicator
const ChatButtonWithNotifications = ({ booking }: { booking: Booking }) => {
  const { hasUnread } = useUnreadMessages(booking.id);
  const { unreadCount } = useUnreadNotifications();
  
  const handleOpenChat = (booking: Booking) => {
    // This functionality will be handled by the parent component
    const event = new CustomEvent('openChat', { detail: booking });
    window.dispatchEvent(event);
  };
  
  return (
    <Button
      onClick={() => handleOpenChat(booking)}
      variant="outline"
      className="border-blue-200 text-blue-600 hover:bg-blue-50 w-full sm:w-auto relative"
      size="sm"
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      <span className="hidden sm:inline">Chat with Booker</span>
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

export function BookingRequests({ talentId, isProSubscriber = false }: BookingRequestsProps) {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [pendingApprovalBookings, setPendingApprovalBookings] = useState<Booking[]>([]);
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'pendingApproval' | 'confirmed' | 'past'>('pending');
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatBooking, setChatBooking] = useState<Booking | null>(null);
  const [hasViewedTab, setHasViewedTab] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchAllBookings();
    
    // TASK 3: Real-time subscription for new direct bookings and status updates
    const bookingChannel = supabase
      .channel('talent-booking-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `talent_id=eq.${talentId}`
        },
        (payload) => {
          console.log('New booking received for talent:', talentId, payload);
          fetchAllBookings(); // Refresh bookings when new booking is created
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `talent_id=eq.${talentId}`
        },
        (payload) => {
          console.log('Booking updated for talent:', talentId, payload);
          // Check if status changed to confirmed (post-payment)
          if (payload.new?.status === 'confirmed') {
            console.log('Booking confirmed after payment, refreshing bookings');
          }
          fetchAllBookings(); // Refresh bookings when status changes
        }
      )
      .subscribe();
    
    // Listen for openChat events from chat buttons
    const handleOpenChatEvent = (event: any) => {
      const booking = event.detail;
      setChatBooking(booking);
      setShowChatModal(true);
    };
    
    window.addEventListener('openChat', handleOpenChatEvent);
    
    return () => {
      supabase.removeChannel(bookingChannel);
      window.removeEventListener('openChat', handleOpenChatEvent);
    };
  }, [talentId]);

  const fetchAllBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('talent_id', talentId)
        .in('status', ['pending', 'approved', 'pending_approval', 'confirmed', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const bookings = data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      setPendingBookings(bookings.filter(b => b.status === 'pending'));
      setPendingApprovalBookings(bookings.filter(b => b.status === 'pending_approval'));
      // TASK 4: Fix post-payment booking logic - only show 'confirmed' status in upcoming
      setConfirmedBookings(bookings.filter(b => 
        b.status === 'confirmed' && 
        new Date(b.event_date) >= today
      ));
      // TASK 3: Past events should only show bookings where event_date is in the past, regardless of status
      setPastBookings(bookings.filter(b => 
        new Date(b.event_date) < today
      ));
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load booking requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'declined' })
        .eq('id', bookingId);

      if (error) throw error;

      // Remove booking from pending list
      setPendingBookings(prev => prev.filter(booking => booking.id !== bookingId));

      toast({
        title: "Success",
        description: "Booking request declined",
      });
    } catch (error) {
      console.error('Error declining booking:', error);
      toast({
        title: "Error",
        description: "Failed to decline booking",
        variant: "destructive",
      });
    }
  };

  const handleAccept = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowInvoiceModal(true);
  };

  const handleInvoiceSuccess = () => {
    fetchAllBookings(); // Refresh all booking lists
    setShowInvoiceModal(false);
    setSelectedBooking(null);
  };

  const handleOpenChat = (booking: Booking) => {
    setChatBooking(booking);
    setShowChatModal(true);
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

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderBookingCard = (booking: Booking, showActions: boolean = true) => (
    <BookingCard
      key={booking.id}
      booking={booking}
      mode="talent"
      showActions={showActions}
      onUpdate={fetchAllBookings}
      isProSubscriber={isProSubscriber}
      talentId={talentId}
    />
  );

  const renderEmptyState = (tab: string) => (
    <Card className="glass-card">
      <CardContent className="text-center py-8">
        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">
          {tab === 'pending' ? 'No New Requests' :
           tab === 'pendingApproval' ? 'No Pending Approvals' :
           tab === 'confirmed' ? 'No Upcoming Events' :
           'No Past Events'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {tab === 'pending' ? 'When clients book you, their requests will appear here' :
           tab === 'pendingApproval' ? 'Invoices awaiting payment will appear here' :
           tab === 'confirmed' ? 'Your confirmed bookings will appear here' :
           'Your completed events will appear here'}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('pending');
              setHasViewedTab(prev => ({ ...prev, pending: true }));
            }}
            className="flex items-center gap-2 relative"
          >
            <Mail className="h-4 w-4" />
            New Requests ({pendingBookings.length})
            {pendingBookings.length > 0 && !hasViewedTab.pending && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">
                  {pendingBookings.length > 99 ? '99+' : pendingBookings.length}
                </span>
              </div>
            )}
          </Button>
          <Button
            variant={activeTab === 'pendingApproval' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('pendingApproval');
              setHasViewedTab(prev => ({ ...prev, pendingApproval: true }));
            }}
            className="flex items-center gap-2 relative"
          >
            <Clock className="h-4 w-4" />
            Pending Approval ({pendingApprovalBookings.length})
            {pendingApprovalBookings.length > 0 && !hasViewedTab.pendingApproval && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">
                  {pendingApprovalBookings.length > 99 ? '99+' : pendingApprovalBookings.length}
                </span>
              </div>
            )}
          </Button>
          <Button
            variant={activeTab === 'confirmed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('confirmed')}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Upcoming / Confirmed ({confirmedBookings.length})
          </Button>
          <Button
            variant={activeTab === 'past' ? 'default' : 'outline'}
            onClick={() => setActiveTab('past')}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Past Events ({pastBookings.length})
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'pending' && (
          pendingBookings.length === 0 ? renderEmptyState('pending') : (
            <Card className="glass-card border-yellow-500/20">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-700">
                  <Mail className="h-5 w-5 mr-2" />
                  New Requests ({pendingBookings.length})
                </CardTitle>
                <CardDescription>
                  New booking requests that need your response
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {pendingBookings.map((booking) => renderBookingCard(booking, true))}
              </CardContent>
            </Card>
          )
        )}

        {activeTab === 'pendingApproval' && (
          pendingApprovalBookings.length === 0 ? renderEmptyState('pendingApproval') : (
            <Card className="glass-card border-orange-500/20">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-700">
                  <Clock className="h-5 w-5 mr-2" />
                  Pending Approval ({pendingApprovalBookings.length})
                </CardTitle>
                <CardDescription>
                  Invoices sent, awaiting booker payment and approval
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {pendingApprovalBookings.map((booking) => renderBookingCard(booking, false))}
              </CardContent>
            </Card>
          )
        )}

        {activeTab === 'confirmed' && (
          confirmedBookings.length === 0 ? renderEmptyState('confirmed') : (
            <Card className="glass-card border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <Check className="h-5 w-5 mr-2" />
                  Upcoming / Confirmed Bookings ({confirmedBookings.length})
                </CardTitle>
                <CardDescription>
                  Your confirmed upcoming events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {confirmedBookings.map((booking) => renderBookingCard(booking, false))}
              </CardContent>
            </Card>
          )
        )}

        {activeTab === 'past' && (
          pastBookings.length === 0 ? renderEmptyState('past') : (
            <Card className="glass-card border-gray-500/20">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-700">
                  <Calendar className="h-5 w-5 mr-2" />
                  Past Events ({pastBookings.length})
                </CardTitle>
                <CardDescription>
                  Your completed events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {pastBookings.map((booking) => renderBookingCard(booking, false))}
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Manual Invoice Modal */}
      {selectedBooking && (
        <ManualInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedBooking(null);
          }}
          booking={selectedBooking}
          isProSubscriber={isProSubscriber}
          onSuccess={handleInvoiceSuccess}
        />
      )}

      {/* Chat Modal */}
      {chatBooking && (
        <ChatModal
          open={showChatModal}
          onOpenChange={setShowChatModal}
          bookingId={chatBooking.id}
          talentName={chatBooking.booker_name}
          eventType={chatBooking.event_type}
          eventDate={chatBooking.event_date}
        />
      )}
    </>
  );
}