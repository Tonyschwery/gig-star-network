import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, Briefcase, Crown, MessageCircle, DollarSign, CheckCircle, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TalentChatModal } from "@/components/TalentChatModal";
import { ManualInvoiceModal } from "@/components/ManualInvoiceModal";
import { ProFeatureWrapper } from "@/components/ProFeatureWrapper";

interface PublicBooking {
  id: string;
  booker_name: string;
  booker_email: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_address: string;
  event_type: string;
  description: string | null;
  created_at: string;
  budget: number | null;
  budget_currency: string;
  talent_id?: string | null;
  status: string;
  user_id: string;
}

interface GigOpportunitiesProps {
  talentId: string;
  isProSubscriber: boolean;
}

export const GigOpportunities = ({ talentId, isProSubscriber }: GigOpportunitiesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [publicRequests, setPublicRequests] = useState<PublicBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PublicBooking | null>(null);

  useEffect(() => {
    if (isProSubscriber) {
      fetchPublicRequests();
    } else {
      setLoading(false);
    }
  }, [isProSubscriber]);

  const fetchPublicRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('is_public_request', true)
        .eq('is_gig_opportunity', true)
        .neq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublicRequests(data || []);
    } catch (error) {
      console.error('Error fetching public requests:', error);
      toast({
        title: "Error",
        description: "Failed to load gig opportunities.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const handleAcceptGig = async (booking: PublicBooking) => {
    if (!user) return;
    
    try {
      // Check if this gig is already assigned to someone
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('talent_id')
        .eq('id', booking.id)
        .single();

      if (currentBooking?.talent_id && currentBooking.talent_id !== talentId) {
        toast({
          title: "Gig Unavailable",
          description: "This gig opportunity has already been claimed by another talent.",
          variant: "destructive",
        });
        return;
      }

      // If not already assigned to this talent, assign it now
      if (!currentBooking?.talent_id) {
        const { error: assignError } = await supabase
          .from('bookings')
          .update({ 
            talent_id: talentId,
            status: 'approved'
          })
          .eq('id', booking.id)
          .is('talent_id', null);

        if (assignError) {
          console.error('Error accepting gig:', assignError);
          toast({
            title: "Error", 
            description: "Failed to accept this gig opportunity. It may have been taken by another talent.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Gig Accepted",
          description: "You have successfully accepted this gig opportunity!",
        });

        // Refresh the gig list to show updated status
        fetchPublicRequests();
      }
    } catch (error) {
      console.error('Error accepting gig:', error);
      toast({
        title: "Error",
        description: "Failed to accept gig. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendInvoice = (booking: PublicBooking) => {
    setSelectedBooking(booking);
    setInvoiceOpen(true);
  };

  const handleDeclineGig = async (booking: PublicBooking) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'declined' })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Gig Declined",
        description: "You have declined this gig opportunity.",
      });

      fetchPublicRequests();
    } catch (error) {
      console.error('Error declining gig:', error);
      toast({
        title: "Error",
        description: "Failed to decline gig. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartChat = async (booking: PublicBooking) => {
    if (!user) return;
    
    try {
      // Check if this gig is already assigned to someone
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('talent_id')
        .eq('id', booking.id)
        .single();

      if (currentBooking?.talent_id && currentBooking.talent_id !== talentId) {
        toast({
          title: "Gig Unavailable",
          description: "This gig opportunity has already been claimed by another talent.",
          variant: "destructive",
        });
        return;
      }

      // If not already assigned to this talent, assign it now
      if (!currentBooking?.talent_id) {
        const { error: assignError } = await supabase
          .from('bookings')
          .update({ talent_id: talentId })
          .eq('id', booking.id)
          .is('talent_id', null);

        if (assignError) {
          console.error('Error assigning talent to gig:', assignError);
          toast({
            title: "Error", 
            description: "Failed to claim this gig opportunity. It may have been taken by another talent.",
            variant: "destructive",
          });
          return;
        }
      }

      // Update the local booking to include talent_id for the chat
      const updatedBooking = { ...booking, talent_id: talentId };
      setSelectedBooking(updatedBooking);
      setChatOpen(true);
      
      // Refresh the gig list to show updated status
      fetchPublicRequests();
      
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderGigCard = (request: PublicBooking) => (
    <Card key={request.id} className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-2xl">
              {getEventTypeIcon(request.event_type)}
            </div>
            <div>
              <CardTitle className="text-xl mb-1">
                {request.event_type.charAt(0).toUpperCase() + request.event_type.slice(1)} Event
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Requested by: <span className="font-medium text-foreground">{request.booker_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <User className="h-3 w-3" />
                <span className="font-medium text-foreground">{request.booker_email}</span>
              </div>
              <Badge variant="outline" className="mt-2">
                {request.status === 'pending' ? 'New Opportunity' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {request.status === 'pending' && (
              <>
                <Button 
                  onClick={() => handleAcceptGig(request)}
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Accept
                </Button>
                <Button 
                  onClick={() => handleSendInvoice(request)}
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  Invoice
                </Button>
                <Button 
                  onClick={() => handleDeclineGig(request)}
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Decline
                </Button>
              </>
            )}
            <Button 
              onClick={() => handleStartChat(request)}
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Chat
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(request.event_date), 'PPP')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{request.event_duration} hours</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{request.event_location}</span>
          </div>
          {request.budget && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {request.budget_currency === 'USD' && '$'}
                {request.budget_currency === 'EUR' && '€'}
                {request.budget_currency === 'GBP' && '£'}
                {!['USD', 'EUR', 'GBP'].includes(request.budget_currency) && request.budget_currency + ' '}
                {request.budget.toLocaleString()}
                {['CAD', 'AUD'].includes(request.budget_currency) && ' ' + request.budget_currency}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium text-foreground">Full Address:</span>
            <p className="text-muted-foreground mt-1">{request.event_address}</p>
          </div>
        </div>

        {request.description && (
          <div className="text-sm">
            <strong className="text-foreground">Event Details:</strong>
            <p className="text-muted-foreground mt-1">{request.description}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Posted on {format(new Date(request.created_at), 'PPP')}
        </div>
      </CardContent>
    </Card>
  );

  const renderProUpgradeCard = () => (
    <Card className="p-8">
      <CardContent className="space-y-4">
        <div className="text-center space-y-4">
          <Crown className="h-16 w-16 text-primary mx-auto" />
          <h3 className="text-2xl font-semibold">Upgrade to Pro to Access Gig Opportunities</h3>
          <p className="text-muted-foreground">
            Access exclusive gig opportunities from bookers looking for talented performers like you.
          </p>
        </div>
        <ul className="space-y-2 text-left">
          <li className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <span>Access exclusive gig opportunities from bookers</span>
          </li>
          <li className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span>Direct contact with event organizers</span>
          </li>
          <li className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span>Pro badge on your profile</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );

  return (
    <ProFeatureWrapper isProFeature={true} className="space-y-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Gig Opportunities</h2>
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <p className="text-muted-foreground">
          Exclusive opportunities from bookers looking for talented performers like you
        </p>
      </div>

      {!isProSubscriber ? (
        renderProUpgradeCard()
      ) : loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading gig opportunities...</p>
        </div>
      ) : publicRequests.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-xl font-semibold mb-2">No Gig Opportunities Yet</h3>
            <p className="text-muted-foreground">
              New opportunities from bookers will appear here. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {publicRequests.map(renderGigCard)}
        </div>
      )}

      {/* Chat Modal */}
      {selectedBooking && (
        <TalentChatModal
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          bookerName={selectedBooking.booker_name}
          bookerEmail={selectedBooking.booker_email}
          eventType={selectedBooking.event_type}
          bookingId={selectedBooking.id}
        />
      )}

      {/* Invoice Modal */}
      {selectedBooking && (
        <ManualInvoiceModal
          isOpen={invoiceOpen}
          onClose={() => setInvoiceOpen(false)}
          booking={{
            id: selectedBooking.id,
            booker_name: selectedBooking.booker_name,
            booker_email: selectedBooking.booker_email,
            event_date: selectedBooking.event_date,
            event_duration: selectedBooking.event_duration,
            event_location: selectedBooking.event_location,
            event_address: selectedBooking.event_address,
            event_type: selectedBooking.event_type,
            description: selectedBooking.description || undefined,
            user_id: selectedBooking.user_id
          }}
          isProSubscriber={isProSubscriber}
          onSuccess={() => {
            fetchPublicRequests();
            setInvoiceOpen(false);
          }}
        />
      )}
    </ProFeatureWrapper>
  );
};