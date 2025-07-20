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
  Clock3
} from "lucide-react";
import { format } from "date-fns";

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
  };
}

const BookerDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/booker-auth');
      return;
    }
    fetchBookings();
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
            picture_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
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

  const pendingBookings = bookings.filter(booking => booking.status === 'pending');
  const approvedBookings = bookings.filter(booking => booking.status === 'approved');
  const declinedBookings = bookings.filter(booking => booking.status === 'declined');

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              Welcome, {user?.email?.split('@')[0] || 'Guest'}!
            </h1>
            <p className="text-muted-foreground">Manage your event bookings</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
            >
              Browse Talents
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingBookings.length}</p>
                </div>
                <Clock3 className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{approvedBookings.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Declined</p>
                  <p className="text-2xl font-bold text-red-600">{declinedBookings.length}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
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
                      
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
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

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => navigate(`/talent/${booking.talent_id}`)}
                      variant="outline"
                      className="flex-1"
                    >
                      <User className="h-4 w-4 mr-2" />
                      View Talent Profile
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message (Coming Soon)
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
                        
                        <div className="grid md:grid-cols-3 gap-3 text-sm">
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

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => navigate(`/talent/${booking.talent_id}`)}
                            variant="outline"
                            size="sm"
                          >
                            <User className="h-4 w-4 mr-2" />
                            View Talent
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Message
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
    </div>
  );
};

export default BookerDashboard;