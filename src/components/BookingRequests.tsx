import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, Mail, User, Check, X } from "lucide-react";
import { ManualInvoiceModal } from "./ManualInvoiceModal";
import { format } from "date-fns";

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

export function BookingRequests({ talentId, isProSubscriber = false }: BookingRequestsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
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
        .eq('status', 'pending')
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

  const handleDecline = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'declined' })
        .eq('id', bookingId);

      if (error) throw error;

      // Remove booking from the list
      setBookings(prev => prev.filter(booking => booking.id !== bookingId));

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
    fetchBookings(); // Refresh to remove accepted bookings
    setShowInvoiceModal(false);
    setSelectedBooking(null);
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

  if (bookings.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Booking Requests
          </CardTitle>
          <CardDescription>
            New booking requests will appear here
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Pending Requests</h3>
          <p className="text-sm text-muted-foreground">
            When clients book you, their requests will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card border-yellow-500/20">
        <CardHeader>
          <CardTitle className="flex items-center text-yellow-700">
            <Mail className="h-5 w-5 mr-2" />
            Booking Requests ({bookings.length})
          </CardTitle>
          <CardDescription>
            New booking requests that need your response
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="border rounded-lg p-6 bg-card space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getEventTypeIcon(booking.event_type)}</span>
                  <div>
                    <h3 className="font-semibold text-lg capitalize">
                      {booking.event_type} Event
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Requested {format(new Date(booking.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/20">
                  Pending
                </Badge>
              </div>

              {/* Event Details */}
              <div className="grid md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
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

              {/* Additional Details */}
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-sm">Full Address:</span>
                  <p className="text-muted-foreground mt-1">{booking.event_address}</p>
                </div>
                <div>
                  <span className="font-medium text-sm">Contact Email:</span>
                  <p className="text-muted-foreground mt-1">{booking.booker_email}</p>
                </div>
                {booking.description && (
                  <div>
                    <span className="font-medium text-sm">Event Description:</span>
                    <p className="text-muted-foreground mt-1">{booking.description}</p>
                  </div>
                )}
                {booking.budget && (
                  <div>
                    <span className="font-medium text-sm">Client Budget:</span>
                    <p className="text-muted-foreground mt-1">
                      {booking.budget} {booking.budget_currency || 'USD'}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleDecline(booking.id)}
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button
                  onClick={() => handleAccept(booking)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept & Send Invoice
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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
    </>
  );
}