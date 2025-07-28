import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Mail, 
  User, 
  LogOut,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock3,
  Bell,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

import { BookerInvoiceCard } from "@/components/BookerInvoiceCard";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ChatModal } from "@/components/ChatModal";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

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

const BookerDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingPayments, setBookingPayments] = useState<Record<string, any>>({});
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatBooking, setChatBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
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
          filter: `user_id=eq.${user.id}`
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
  }, [user, navigate]);

  const fetchBookings = async () => {
    if (!user) return;

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
        .eq('user_id', user.id)
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/20';
      case 'approved':
        return 'bg-green-500/20 text-green-700 border-green-500/20';
      case 'declined':
        return 'bg-red-500/20 text-red-700 border-red-500/20';
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
      case 'declined':
        return <XCircle className="h-4 w-4" />;
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
    
    return (
      <Button
        onClick={() => handleOpenChat(booking)}
        variant={variant}
        size={size}
        className="relative flex-shrink-0"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Chat with Talent</span>
        <span className="sm:hidden">Chat</span>
        {hasUnread && (
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
        )}
      </Button>
    );
  };

  const pendingBookings = bookings.filter(booking => booking.status === 'pending');
  const approvedBookings = bookings.filter(booking => booking.status === 'approved');
  const declinedBookings = bookings.filter(booking => booking.status === 'declined');
  // Note: 'completed' bookings are filtered out - they don't appear in any dashboard

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                Welcome, {user?.email?.split('@')[0] || 'Guest'}!
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">Manage your event bookings</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex-shrink-0"
              size="sm"
            >
              Browse Talents
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="flex-shrink-0"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Logout</span>
            </Button>
          </div>
        </div>

        {/* Notification Center */}
        <div className="mb-6">
          <NotificationCenter />
        </div>

        {/* Approved Bookings - Payment Required */}
        {approvedBookings.length > 0 && (
          <Card className="glass-card border-green-500/20 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <AlertCircle className="h-5 w-5 mr-2" />
                Payment Required ({approvedBookings.length})
              </CardTitle>
              <CardDescription>
                These bookings have been approved by the talent and require payment to confirm
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {approvedBookings.map((booking) => (
                <div key={booking.id} className="border border-green-200 rounded-lg p-4 bg-green-50/50 dark:bg-green-950/20 space-y-3">
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
                      
                      <div className="bg-green-100/50 dark:bg-green-900/20 p-3 rounded-lg">
                        <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Talent: {booking.talent_profiles?.artist_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Approved! Payment required to confirm booking.
                        </div>
                      </div>
                      
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
                          <span>Approved {format(new Date(booking.created_at), 'MMM d, yyyy')}</span>
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


                  {/* Chat and Payment Interface */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <ChatButton booking={booking} variant="outline" size="sm" />
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
                  </div>

                  {/* Payment Interface */}
                  {bookingPayments[booking.id] && (
                    <div className="mt-4 pt-4 border-t">
                      <BookerInvoiceCard
                        booking={booking}
                        payment={bookingPayments[booking.id]}
                        onPaymentUpdate={fetchBookings}
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card className="glass-card">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-lg md:text-2xl font-bold">{bookings.length}</p>
                </div>
                <Calendar className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-lg md:text-2xl font-bold text-yellow-600">{pendingBookings.length}</p>
                </div>
                <Clock3 className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-lg md:text-2xl font-bold text-green-600">{approvedBookings.length}</p>
                </div>
                <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Declined</p>
                  <p className="text-lg md:text-2xl font-bold text-red-600">{declinedBookings.length}</p>
                </div>
                <XCircle className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Bookings */}
        {pendingBookings.length > 0 && (
          <Card className="glass-card border-yellow-500/20 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-700">
                <Clock3 className="h-5 w-5 mr-2" />
                Pending Bookings ({pendingBookings.length})
              </CardTitle>
              <CardDescription>
                Your booking requests awaiting talent approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingBookings.map((booking) => (
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
                      
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Talent: {booking.talent_profiles?.artist_name || 'Unknown'}
                        </div>
                      </div>
                      
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
                          <span>Requested {format(new Date(booking.created_at), 'MMM d, yyyy')}</span>
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


                  <div className="flex flex-wrap gap-2 pt-2">
                    <ChatButton booking={booking} variant="outline" size="sm" />
                    <Button
                      onClick={() => navigate(`/talent/${booking.talent_id}`)}
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                    >
                      <User className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">View Talent Profile</span>
                      <span className="sm:hidden">Profile</span>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Bookings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              All Your Bookings ({bookings.length})
            </CardTitle>
            <CardDescription>
              View all your booking requests and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Bookings Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by browsing our talented performers and book your first event
                </p>
                <Button onClick={() => navigate('/')}>
                  Browse Talents
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4 bg-card">
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
                        
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <div className="font-medium text-foreground flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Talent: {booking.talent_profiles?.artist_name || 'Unknown'}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 text-xs sm:text-sm">
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


                        <div className="flex flex-wrap gap-2 pt-2">
                          <ChatButton booking={booking} variant="outline" size="sm" />
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
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Chat Modal */}
      {chatBooking && (
        <ChatModal
          open={showChatModal}
          onOpenChange={setShowChatModal}
          bookingId={chatBooking.id}
          talentName={chatBooking.talent_profiles?.artist_name || 'Unknown'}
          eventType={chatBooking.event_type}
          eventDate={chatBooking.event_date}
        />
      )}
    </div>
  );
};

export default BookerDashboard;