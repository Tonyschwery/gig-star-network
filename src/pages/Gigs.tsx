import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, Briefcase, Crown, MessageCircle, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ChatModal } from "@/components/ChatModal";

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
  equipment_types: string[];
  needs_equipment: boolean;
  custom_equipment: string | null;
  budget: number | null;
  budget_currency: string;
  talent_id?: string | null;
}

export default function Gigs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [publicRequests, setPublicRequests] = useState<PublicBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProTalent, setIsProTalent] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedBooker, setSelectedBooker] = useState<PublicBooking | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkProStatus();
  }, [user, navigate]);

  const checkProStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('talent_profiles')
        .select('is_pro_subscriber')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.is_pro_subscriber) {
        setIsProTalent(true);
        fetchPublicRequests();
      } else {
        setIsProTalent(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking pro status:', error);
      setLoading(false);
    }
  };

  const fetchPublicRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('is_public_request', true)
        .eq('is_gig_opportunity', true)
        .neq('status', 'completed') // Exclude completed gigs
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

  const handleStartChat = async (request: PublicBooking) => {
    if (!user) return;
    
    try {
      // Get the current user's talent profile
      const { data: talentProfile, error: profileError } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !talentProfile) {
        toast({
          title: "Error",
          description: "Talent profile not found. Please complete your profile first.",
          variant: "destructive",
        });
        return;
      }

      // Check if this gig is already assigned to someone
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('talent_id')
        .eq('id', request.id)
        .single();

      if (currentBooking?.talent_id && currentBooking.talent_id !== talentProfile.id) {
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
          .update({ talent_id: talentProfile.id })
          .eq('id', request.id)
          .is('talent_id', null); // Only update if still unassigned

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

      // Update the local request to include talent_id for the chat
      const updatedRequest = { ...request, talent_id: talentProfile.id };
      setSelectedBooker(updatedRequest);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 container mx-auto px-4">
          <div className="text-center">Loading gig opportunities...</div>
        </div>
      </div>
    );
  }

  if (!isProTalent) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="pt-24 container mx-auto px-4 pb-12">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="space-y-4">
              <Crown className="h-16 w-16 text-brand-primary mx-auto" />
              <h1 className="text-4xl font-bold gradient-text">Pro Feature</h1>
              <p className="text-xl text-muted-foreground">
                Access to exclusive gig opportunities is available for Pro subscribers only.
              </p>
            </div>
            
            <Card className="p-8">
              <CardContent className="space-y-4">
                <h3 className="text-2xl font-semibold">Upgrade to Pro to:</h3>
                <ul className="space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-brand-primary" />
                    <span>Access exclusive gig opportunities from bookers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <User className="h-4 w-4 text-brand-primary" />
                    <span>Direct contact with event organizers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-brand-primary" />
                    <span>Pro badge on your profile</span>
                  </li>
                </ul>
                <Button 
                  className="hero-button w-full mt-6"
                  onClick={() => navigate('/talent-dashboard')}
                >
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 container mx-auto px-4 pb-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="h-8 w-8 text-brand-primary" />
            <h1 className="text-4xl font-bold gradient-text">Gig Opportunities</h1>
            <Crown className="h-8 w-8 text-brand-primary" />
          </div>
          <p className="text-muted-foreground">
            Exclusive opportunities from bookers looking for talented performers like you
          </p>
        </div>

        {publicRequests.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="text-xl font-semibold mb-2">No Gig Opportunities Yet</h3>
              <p className="text-muted-foreground mb-6">
                New opportunities from bookers will appear here. Check back soon!
              </p>
              <Button 
                onClick={() => navigate('/')}
                className="hero-button"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {publicRequests.map((request) => (
              <Card key={request.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-2xl">
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
                          New Opportunity
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleStartChat(request)}
                        size="sm"
                        className="hero-button h-8 px-3 text-xs"
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Start Chat
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

                  {request.needs_equipment && (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium text-foreground">Equipment Needed:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {request.equipment_types && request.equipment_types.map((equipment, index) => (
                            <Badge key={index} variant="secondary">
                              {equipment}
                            </Badge>
                          ))}
                          {request.custom_equipment && (
                            <Badge variant="secondary">
                              {request.custom_equipment}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

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
            ))}
          </div>
        )}
      </div>

      {selectedBooker && (
        <ChatModal
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          bookerName={selectedBooker.booker_name}
          bookerEmail={selectedBooker.booker_email}
          eventType={selectedBooker.event_type}
          bookingId={selectedBooker.id}
          isGigOpportunity={true}
          isPublicRequest={true}
        />
      )}
    </div>
  );
}