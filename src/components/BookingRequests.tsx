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
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'past'>('pending');
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatBooking, setChatBooking] = useState<Booking | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllBookings();
    
    // Listen for openChat events from chat buttons
    const handleOpenChatEvent = (event: any) => {
      const booking = event.detail;
      setChatBooking(booking);
      setShowChatModal(true);
    };
    
    window.addEventListener('openChat', handleOpenChatEvent);
    
    return () => {
      window.removeEventListener('openChat', handleOpenChatEvent);
    };
  }, [talentId]);

  const fetchAllBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('talent_id', talentId)
        .in('status', ['pending', 'approved', 'confirmed', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const bookings = data || [];
      const now = new Date();
      
      setPendingBookings(bookings.filter(b => b.status === 'pending'));
      setConfirmedBookings(bookings.filter(b => 
        (b.status === 'approved' || b.status === 'confirmed') && 
        new Date(b.event_date) >= now
      ));
      setPastBookings(bookings.filter(b => 
        b.status === 'completed' || 
        (new Date(b.event_date) < now && b.status !== 'pending')
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
    <div key={booking.id} className="border rounded-lg p-3 sm:p-4 bg-card space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl">{getEventTypeIcon(booking.event_type)}</span>
          <div>
            <h3 className="font-semibold text-base sm:text-lg capitalize">
              {booking.event_type} Event
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Requested {format(new Date(booking.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <Badge className={
          booking.status === 'pending' ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/20" :
          booking.status === 'confirmed' ? "bg-green-500/20 text-green-700 border-green-500/20" :
          booking.status === 'approved' ? "bg-blue-500/20 text-blue-700 border-blue-500/20" :
          "bg-gray-500/20 text-gray-700 border-gray-500/20"
        }>
          {booking.status === 'confirmed' ? 'Confirmed' : 
           booking.status === 'approved' ? 'Approved' :
           booking.status === 'completed' ? 'Completed' : 'Pending'}
        </Badge>
      </div>

      {/* Event Details - Compact for confirmed bookings */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 bg-muted/30 p-3 rounded-lg text-sm ${!showActions ? 'md:grid-cols-4' : ''}`}>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{format(new Date(booking.event_date), 'PPP')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{booking.event_duration} hours</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{booking.event_location}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{booking.booker_name}</span>
        </div>
      </div>

      {/* Additional Details - Show less for confirmed bookings */}
      {showActions && (
        <div className="space-y-2 sm:space-y-3">
          <div>
            <span className="font-medium text-xs sm:text-sm">Full Address:</span>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">{booking.event_address}</p>
          </div>
          <div>
            <span className="font-medium text-xs sm:text-sm">Contact Email:</span>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm break-all">{booking.booker_email}</p>
          </div>
          {booking.description && (
            <div>
              <span className="font-medium text-xs sm:text-sm">Event Description:</span>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">{booking.description}</p>
            </div>
          )}
          {booking.budget && (
            <div>
              <span className="font-medium text-xs sm:text-sm">Client Budget:</span>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                {booking.budget} {booking.budget_currency || 'USD'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
        <ChatButtonWithNotifications booking={booking} />
        {showActions && (
          <>
            <Button
              onClick={() => handleDecline(booking.id)}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto"
              size="sm"
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
            <Button
              onClick={() => handleAccept(booking)}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              size="sm"
            >
              <Check className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Accept & Send Invoice</span>
              <span className="sm:hidden">Accept</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const renderEmptyState = (tab: string) => (
    <Card className="glass-card">
      <CardContent className="text-center py-8">
        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">
          {tab === 'pending' ? 'No Pending Requests' :
           tab === 'confirmed' ? 'No Upcoming Events' :
           'No Past Events'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {tab === 'pending' ? 'When clients book you, their requests will appear here' :
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
            onClick={() => setActiveTab('pending')}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Pending Approval ({pendingBookings.length})
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
                  Booking Requests ({pendingBookings.length})
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