import { useState, useEffect } from "react";
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
  Clock3,
  AlertCircle,
  Sparkles,
  CreditCard
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BookerInvoiceCard } from "@/components/BookerInvoiceCard";
import { ChatModal } from "@/components/ChatModal";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface GigApplication {
  id: string;
  gig_id?: string;
  talent_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  talent_profiles: {
    artist_name: string;
    picture_url?: string;
    rate_per_hour?: number;
    is_pro_subscriber: boolean;
  };
}

interface GigPosting {
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
  budget?: number;
  budget_currency?: string;
  is_public_request: boolean;
  is_gig_opportunity: boolean;
  payment_id?: string;
  applications?: GigApplication[];
}

interface BookerGigDashboardProps {
  userId: string;
}

export const BookerGigDashboard = ({ userId }: BookerGigDashboardProps) => {
  const [activeTab, setActiveTab] = useState("awaiting");
  const [gigPostings, setGigPostings] = useState<GigPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [gigPayments, setGigPayments] = useState<Record<string, any>>({});
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatGig, setChatGig] = useState<GigPosting | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGigPostings();
    
    // Set up real-time subscription for gig updates
    const channel = supabase
      .channel('booker-gig-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchGigPostings();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gig_applications'
        },
        () => {
          fetchGigPostings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchGigPostings = async () => {
    try {
      // Fetch gig postings created by the booker
      const { data: gigsData, error: gigsError } = await supabase
        .from('bookings')
        .select(`
          *,
          gig_applications!gig_applications_gig_id_fkey (
            id,
            talent_id,
            status,
            created_at,
            updated_at,
            talent_profiles (
              artist_name,
              picture_url,
              rate_per_hour,
              is_pro_subscriber
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_gig_opportunity', true)
        .eq('is_public_request', true)
        .order('created_at', { ascending: false });

      if (gigsError) throw gigsError;
      
      const gigs = (gigsData || []).map(gig => ({
        ...gig,
        applications: (gig.gig_applications || []).map(app => ({
          ...app,
          gig_id: gig.id
        }))
      }));
      
      setGigPostings(gigs);
      
      // Fetch payment details for approved gigs
      const approvedGigIds = gigs
        .filter(gig => gig.status === 'approved' && gig.payment_id)
        .map(gig => gig.payment_id);
        
      if (approvedGigIds.length > 0) {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .in('id', approvedGigIds);
          
        if (!paymentsError && payments) {
          const paymentsMap = payments.reduce((acc, payment) => {
            acc[payment.booking_id] = payment;
            return acc;
          }, {} as Record<string, any>);
          setGigPayments(paymentsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching gig postings:', error);
      toast({
        title: "Error",
        description: "Failed to load your gig postings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleOpenChat = (gig: GigPosting) => {
    setChatGig(gig);
    setShowChatModal(true);
  };

  // MASTER TASK 1: Chat Button Component - Only show if conversation exists for gig
  const GigChatButton = ({ gig }: { gig: GigPosting }) => {
    const { hasUnread } = useUnreadMessages(gig.id);
    const [hasConversation, setHasConversation] = useState(false);
    
    // Check if conversation exists for any application of this gig
    useEffect(() => {
      const checkConversation = async () => {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select('id')
            .eq('booking_id', gig.id)
            .not('gig_application_id', 'is', null)
            .maybeSingle();
            
          if (!error) {
            setHasConversation(!!data);
          }
        } catch (error) {
          console.error('Error checking conversation:', error);
        }
      };
      
      checkConversation();
    }, [gig.id, gig.applications]);
    
    // MASTER TASK 1: Only show chat button if conversation exists (after talent sends invoice)
    if (!hasConversation) {
      return null;
    }
    
    return (
      <Button
        onClick={() => handleOpenChat(gig)}
        variant="outline"
        size="sm"
        className="relative flex-shrink-0"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Chat</span>
        <span className="sm:hidden">Chat</span>
        {hasUnread && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">!</span>
          </div>
        )}
      </Button>
    );
  };

  // Filter gig postings by status and date
  const awaitingGigs = gigPostings.filter(gig => gig.status === 'pending');
  const actionRequiredGigs = gigPostings.filter(gig => gig.status === 'approved');
  const upcomingGigs = gigPostings.filter(gig => 
    gig.status === 'confirmed' && new Date(gig.event_date) >= new Date()
  );
  const pastGigs = gigPostings.filter(gig => 
    gig.status === 'completed' || 
    (new Date(gig.event_date) < new Date() && gig.status !== 'pending' && gig.status !== 'approved')
  );

  const renderGigCard = (gig: GigPosting, showPaymentInterface: boolean = false) => (
    <div key={gig.id} className="border rounded-lg p-4 bg-card space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getEventTypeIcon(gig.event_type)}</span>
            <h3 className="font-semibold capitalize">
              {gig.event_type} Gig Opportunity
            </h3>
            <Badge className={getStatusColor(gig.status)}>
              {getStatusIcon(gig.status)}
              <span className="ml-1">{gig.status}</span>
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/20">
              <Sparkles className="h-3 w-3 mr-1" />
              Public Gig
            </Badge>
          </div>
          
          {/* Applications Status */}
          {gig.applications && gig.applications.length > 0 && (
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Applications: {gig.applications.length}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {gig.applications.slice(0, 3).map((app) => (
                  <div key={app.id} className="text-sm">
                    <span className="font-medium">{app.talent_profiles.artist_name}</span>
                    <Badge 
                      className={`ml-2 text-xs ${
                        app.status === 'interested' ? 'bg-blue-500/20 text-blue-700' :
                        app.status === 'invoice_sent' ? 'bg-yellow-500/20 text-yellow-700' :
                        app.status === 'confirmed' ? 'bg-green-500/20 text-green-700' :
                        'bg-gray-500/20 text-gray-700'
                      }`}
                    >
                      {app.status === 'interested' ? 'Applied' :
                       app.status === 'invoice_sent' ? 'Invoice Sent' :
                       app.status === 'confirmed' ? 'Confirmed' : app.status}
                    </Badge>
                  </div>
                ))}
                {gig.applications.length > 3 && (
                  <div className="text-sm text-muted-foreground">
                    +{gig.applications.length - 3} more
                  </div>
                )}
              </div>
              {gig.status === 'approved' && (
                <div className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1 mt-2">
                  <CheckCircle className="h-4 w-4" />
                  Talent accepted! Payment required to confirm.
                </div>
              )}
              {gig.status === 'confirmed' && (
                <div className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-1 mt-2">
                  <CheckCircle className="h-4 w-4" />
                  Confirmed and paid!
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(gig.event_date), 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{gig.event_duration} hours</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{gig.event_location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Posted {format(new Date(gig.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium text-foreground">Full Address:</span>
              <p className="text-muted-foreground mt-1">{gig.event_address}</p>
            </div>
            {gig.description && (
              <div className="text-sm">
                <span className="font-medium text-foreground">Event Description:</span>
                <p className="text-muted-foreground mt-1">{gig.description}</p>
              </div>
            )}
            {gig.budget && (
              <div className="text-sm">
                <span className="font-medium text-foreground">Budget:</span>
                <p className="text-muted-foreground mt-1">
                  ${gig.budget} {gig.budget_currency || 'USD'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat and Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <GigChatButton gig={gig} />
        <Button
          onClick={() => navigate('/your-event')}
          variant="outline"
          size="sm"
          className="flex-shrink-0"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Create Another Gig</span>
          <span className="sm:hidden">New Gig</span>
        </Button>
      </div>

      {/* Payment Interface for approved gigs */}
      {showPaymentInterface && gigPayments[gig.id] && (
        <div className="mt-4 pt-4 border-t">
          <BookerInvoiceCard
            booking={gig}
            payment={gigPayments[gig.id]}
            onPaymentUpdate={fetchGigPostings}
          />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === 'awaiting' ? 'default' : 'outline'}
            onClick={() => setActiveTab('awaiting')}
            className="flex items-center gap-2"
          >
            <Clock3 className="h-4 w-4" />
            <span className="hidden sm:inline">Awaiting Response</span>
            <span className="sm:hidden">Awaiting</span>
            {awaitingGigs.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {awaitingGigs.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'action' ? 'default' : 'outline'}
            onClick={() => setActiveTab('action')}
            className="flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Action Required</span>
            <span className="sm:hidden">Action</span>
            {actionRequiredGigs.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {actionRequiredGigs.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setActiveTab('upcoming')}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Upcoming / Confirmed</span>
            <span className="sm:hidden">Upcoming</span>
            {upcomingGigs.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {upcomingGigs.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'past' ? 'default' : 'outline'}
            onClick={() => setActiveTab('past')}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Past Events</span>
            <span className="sm:hidden">Past</span>
            {pastGigs.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pastGigs.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'awaiting' && (
          <Card className="glass-card border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-700">
                <Clock3 className="h-5 w-5 mr-2" />
                Awaiting Response ({awaitingGigs.length})
              </CardTitle>
              <CardDescription>
                Your gig postings awaiting talent applications or responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {awaitingGigs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Pending Gigs</h3>
                  <p className="text-sm text-muted-foreground">
                    Your gig postings awaiting talent responses will appear here
                  </p>
                  <Button 
                    onClick={() => navigate('/your-event')}
                    className="mt-4"
                    variant="outline"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Your First Gig
                  </Button>
                </div>
              ) : (
                awaitingGigs.map((gig) => renderGigCard(gig))
              )}
            </CardContent>
          </Card>
        )}
        
        {activeTab === 'action' && (
          <Card className="glass-card border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <AlertCircle className="h-5 w-5 mr-2" />
                Action Required ({actionRequiredGigs.length})
              </CardTitle>
              <CardDescription>
                Accepted gigs that require payment to confirm
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {actionRequiredGigs.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Payments Required</h3>
                  <p className="text-sm text-muted-foreground">
                    Accepted gigs requiring payment will appear here
                  </p>
                </div>
              ) : (
                actionRequiredGigs.map((gig) => renderGigCard(gig, true))
              )}
            </CardContent>
          </Card>
        )}
        
        {activeTab === 'upcoming' && (
          <Card className="glass-card border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-700">
                <CheckCircle className="h-5 w-5 mr-2" />
                Upcoming / Confirmed ({upcomingGigs.length})
              </CardTitle>
              <CardDescription>
                Your confirmed upcoming gig events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingGigs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Upcoming Gigs</h3>
                  <p className="text-sm text-muted-foreground">
                    Your confirmed upcoming gig events will appear here
                  </p>
                </div>
              ) : (
                upcomingGigs.map((gig) => renderGigCard(gig))
              )}
            </CardContent>
          </Card>
        )}
        
        {activeTab === 'past' && (
          <Card className="glass-card border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-700">
                <Calendar className="h-5 w-5 mr-2" />
                Past Events ({pastGigs.length})
              </CardTitle>
              <CardDescription>
                Your completed gig events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pastGigs.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Past Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Your completed gig events will appear here
                  </p>
                </div>
              ) : (
                pastGigs.map((gig) => renderGigCard(gig))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat Modal */}
      {chatGig && (
        <ChatModal
          open={showChatModal}
          onOpenChange={setShowChatModal}
          bookingId={chatGig.id}
          talentName="Talent"
          eventType={chatGig.event_type}
          eventDate={chatGig.event_date}
        />
      )}
    </>
  );
};