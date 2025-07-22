import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Calendar, Clock, MapPin, Mail, User, Crown, Lock, MessageCircle, Settings } from "lucide-react";
import { BookingChat } from "./BookingChat";
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
  user_id: string;
  needs_equipment?: boolean;
  equipment_types?: string[];
  custom_equipment?: string;
}

interface BookingManagementProps {
  talentId: string;
  isProSubscriber?: boolean;
  onUpgrade?: () => void;
}

export function BookingManagement({ talentId, isProSubscriber = false, onUpgrade }: BookingManagementProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, [talentId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('talent_id', talentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
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

  const updateBookingStatus = async (bookingId: string, newStatus: 'approved' | 'declined') => {
    setUpdatingBooking(bookingId);
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      // Update local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        )
      );

      toast({
        title: "Success",
        description: `Booking ${newStatus} successfully!`,
      });
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: `Failed to ${newStatus === 'approved' ? 'approve' : 'decline'} booking`,
        variant: "destructive",
      });
    } finally {
      setUpdatingBooking(null);
    }
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
  const otherBookings = bookings.filter(booking => booking.status !== 'pending');

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

  return (
    <div className="space-y-6">
      {/* Pending Bookings */}
      {pendingBookings.length > 0 && (
        <Card className="glass-card border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-700">
              <Mail className="h-5 w-5 mr-2" />
              Pending Booking Requests ({pendingBookings.length})
            </CardTitle>
            <CardDescription>
              New booking requests that need your approval
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
                        {booking.status}
                      </Badge>
                    </div>
                    
                    <div className="bg-muted/30 p-3 rounded-lg">
                      {isProSubscriber ? (
                        <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Booker: {booking.booker_name}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Lock className="h-4 w-4" />
                            <span className="font-medium">Booker Details (Pro Only)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={onUpgrade}
                              size="sm"
                              className="hero-button h-8"
                            >
                              <Crown className="h-3 w-3 mr-1" />
                              Upgrade to Pro
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              See booker name and contact details
                            </span>
                          </div>
                        </div>
                      )}
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

                    <div className="space-y-3">
                      {isProSubscriber ? (
                        <>
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
                          {booking.needs_equipment && (
                            <div className="text-sm">
                              <div className="flex items-center gap-2 font-medium text-foreground mb-2">
                                <Settings className="h-4 w-4" />
                                Equipment Needed:
                              </div>
                              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                {booking.equipment_types && booking.equipment_types.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Selected Equipment:</p>
                                    <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside">
                                      {booking.equipment_types.map((equipment, index) => (
                                        <li key={index} className="capitalize">{equipment}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {booking.custom_equipment && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Custom Equipment:</p>
                                    <p className="text-xs text-amber-700 dark:text-amber-300">{booking.custom_equipment}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm border rounded-lg p-3 bg-muted/10">
                          <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Lock className="h-4 w-4" />
                            <span className="font-medium">Event Details (Pro Only)</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Upgrade to Pro to see full address, event description, equipment requirements, and contact the booker directly.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chat Section for Pending Bookings */}
                <div className="mt-4 pt-4 border-t">
                  <BookingChat
                    bookingId={booking.id}
                    bookerName={booking.booker_name}
                    isProSubscriber={isProSubscriber}
                    onUpgrade={onUpgrade}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => updateBookingStatus(booking.id, 'approved')}
                    disabled={updatingBooking === booking.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => updateBookingStatus(booking.id, 'declined')}
                    disabled={updatingBooking === booking.id}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Decline
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
            All Booking Requests ({bookings.length})
          </CardTitle>
          <CardDescription>
            View all your booking requests and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Booking Requests</h3>
              <p className="text-sm text-muted-foreground">
                When clients book you, their requests will appear here
              </p>
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
                          {booking.status}
                        </Badge>
                      </div>
                      
                      <div className="bg-muted/30 p-3 rounded-lg">
                        {isProSubscriber ? (
                          <div className="font-medium text-foreground flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Booker: {booking.booker_name}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Lock className="h-4 w-4" />
                              <span className="font-medium">Booker Details (Pro Only)</span>
                            </div>
                            <Button
                              onClick={onUpgrade}
                              size="sm"
                              className="hero-button h-7 text-xs"
                            >
                              <Crown className="h-3 w-3 mr-1" />
                              Upgrade
                            </Button>
                          </div>
                        )}
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
                        {isProSubscriber ? (
                          <>
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
                            {booking.needs_equipment && (
                              <div className="text-sm">
                                <div className="flex items-center gap-2 font-medium text-foreground mb-2">
                                  <Settings className="h-4 w-4" />
                                  Equipment Needed:
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                  {booking.equipment_types && booking.equipment_types.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Selected Equipment:</p>
                                      <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside">
                                        {booking.equipment_types.map((equipment, index) => (
                                          <li key={index} className="capitalize">{equipment}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {booking.custom_equipment && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Custom Equipment:</p>
                                      <p className="text-xs text-amber-700 dark:text-amber-300">{booking.custom_equipment}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm border rounded-lg p-3 bg-muted/10">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                              <Lock className="h-4 w-4" />
                              <span className="font-medium">Event Details (Pro Only)</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Full address, event details, and equipment requirements available with Pro subscription.
                            </p>
                          </div>
                        )}
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
  );
}