import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Booking {
  id: string;
  booker_name: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_address: string;
  event_type: string;
  description: string | null;
  status: string;
  created_at: string;
  talent_profiles: {
    artist_name: string;
    picture_url: string | null;
    rate_per_hour: number | null;
    currency: string | null;
  };
}

export default function Gigs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
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
            picture_url,
            rate_per_hour,
            currency
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
        description: "Failed to load your bookings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-300';
      default:
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
    }
  };

  const getEventTypeIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      wedding: "💒",
      birthday: "🎂",
      corporate: "🏢",
      opening: "🎉",
      club: "🎵",
      school: "🎓",
      festival: "🎭"
    };
    return iconMap[type] || "🎪";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 container mx-auto px-4">
          <div className="text-center">Loading your gigs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 container mx-auto px-4 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">My Gigs</h1>
          <p className="text-muted-foreground">Manage your event bookings and requests</p>
        </div>

        {bookings.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl mb-4">🎪</div>
              <h3 className="text-xl font-semibold mb-2">No Gigs Yet</h3>
              <p className="text-muted-foreground mb-6">
                You haven't booked any talent yet. Start by exploring our amazing artists!
              </p>
              <Button 
                onClick={() => navigate('/')}
                className="hero-button"
              >
                Find Talent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-2xl">
                        {booking.talent_profiles.picture_url ? (
                          <img 
                            src={booking.talent_profiles.picture_url} 
                            alt={booking.talent_profiles.artist_name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <User className="h-8 w-8 text-white" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-xl mb-1">
                          {booking.talent_profiles.artist_name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getEventTypeIcon(booking.event_type)}</span>
                          <span className="capitalize font-medium text-foreground">
                            {booking.event_type} Event
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Booked by: <span className="font-medium text-foreground">{booking.booker_name}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(booking.event_date), 'PPP')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.event_duration} hours</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{booking.event_location}</span>
                    </div>
                    {booking.talent_profiles.rate_per_hour && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Estimated: {booking.talent_profiles.currency || 'USD'} {booking.talent_profiles.rate_per_hour * booking.event_duration}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium text-foreground">Full Address:</span>
                      <p className="text-muted-foreground mt-1">{booking.event_address}</p>
                    </div>
                  </div>

                  {booking.description && (
                    <div className="text-sm">
                      <strong className="text-foreground">Description:</strong>
                      <p className="text-muted-foreground mt-1">{booking.description}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Requested on {format(new Date(booking.created_at), 'PPP')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}