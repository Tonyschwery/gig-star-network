import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, Mail, User, Check, X, MessageCircle, Crown, Sparkles } from "lucide-react";
import { ManualInvoiceModal } from "./ManualInvoiceModal";
import { ChatModal } from "./ChatModal";
import { format } from "date-fns";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

interface GigOpportunity {
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
  budget?: number;
  budget_currency?: string;
  is_public_request: boolean;
  is_gig_opportunity: boolean;
}

interface GigOpportunitiesProps {
  isProSubscriber: boolean;
  onUpgrade: () => void;
}

// Mock gig data for free users
const mockGigs: GigOpportunity[] = [
  {
    id: "mock-1",
    booker_name: "Event Organizer",
    booker_email: "organizer@example.com",
    event_date: "2025-08-15",
    event_duration: 4,
    event_location: "Dubai, UAE",
    event_address: "Dubai Convention Center",
    event_type: "festival",
    description: "Looking for talented performers for our summer festival",
    status: "pending",
    created_at: new Date().toISOString(),
    user_id: "mock-user",
    budget: 2500,
    budget_currency: "USD",
    is_public_request: true,
    is_gig_opportunity: true,
  },
  {
    id: "mock-2",
    booker_name: "Corporate Client",
    booker_email: "events@corp.com",
    event_date: "2025-08-20",
    event_duration: 3,
    event_location: "Abu Dhabi, UAE",
    event_address: "Business District",
    event_type: "corporate",
    description: "Corporate event entertainment needed",
    status: "pending",
    created_at: new Date().toISOString(),
    user_id: "mock-user",
    budget: 1800,
    budget_currency: "USD",
    is_public_request: true,
    is_gig_opportunity: true,
  }
];

// Chat Button Component with unread indicator
const ChatButtonWithNotifications = ({ 
  gig, 
  disabled = false 
}: { 
  gig: GigOpportunity; 
  disabled?: boolean;
}) => {
  const { hasUnread } = useUnreadMessages(gig.id);
  const { unreadCount } = useUnreadNotifications();
  
  const handleOpenChat = (gig: GigOpportunity) => {
    if (disabled) return;
    const event = new CustomEvent('openGigChat', { detail: gig });
    window.dispatchEvent(event);
  };
  
  return (
    <Button
      onClick={() => handleOpenChat(gig)}
      variant="outline"
      className={`border-blue-200 text-blue-600 hover:bg-blue-50 w-full sm:w-auto relative ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      size="sm"
      disabled={disabled}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      <span className="hidden sm:inline">Contact Client</span>
      <span className="sm:hidden">Contact</span>
      {!disabled && (hasUnread || unreadCount > 0) && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      )}
    </Button>
  );
};

export function GigOpportunities({ isProSubscriber, onUpgrade }: GigOpportunitiesProps) {
  const [realGigs, setRealGigs] = useState<GigOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGig, setSelectedGig] = useState<GigOpportunity | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatGig, setChatGig] = useState<GigOpportunity | null>(null);
  const { toast } = useToast();

  // Use real gigs for pro users, mock gigs for free users
  const gigs = isProSubscriber ? realGigs : mockGigs;

  useEffect(() => {
    if (isProSubscriber) {
      fetchGigOpportunities();
    } else {
      setLoading(false);
    }
    
    // Listen for openGigChat events from chat buttons
    const handleOpenChatEvent = (event: any) => {
      if (!isProSubscriber) return;
      const gig = event.detail;
      setChatGig(gig);
      setShowChatModal(true);
    };
    
    window.addEventListener('openGigChat', handleOpenChatEvent);
    
    return () => {
      window.removeEventListener('openGigChat', handleOpenChatEvent);
    };
  }, [isProSubscriber]);

  const fetchGigOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('is_public_request', true)
        .eq('is_gig_opportunity', true)
        .eq('status', 'pending')
        .is('talent_id', null) // Only unassigned gigs
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRealGigs(data || []);
    } catch (error) {
      console.error('Error fetching gig opportunities:', error);
      toast({
        title: "Error",
        description: "Failed to load gig opportunities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptGig = (gig: GigOpportunity) => {
    if (!isProSubscriber) {
      onUpgrade();
      return;
    }
    setSelectedGig(gig);
    setShowInvoiceModal(true);
  };

  const handleInvoiceSuccess = () => {
    fetchGigOpportunities(); // Refresh to remove accepted gigs
    setShowInvoiceModal(false);
    setSelectedGig(null);
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

  const renderGigCard = (gig: GigOpportunity) => (
    <div 
      key={gig.id} 
      className={`border rounded-lg p-3 sm:p-4 bg-card space-y-3 sm:space-y-4 relative ${
        !isProSubscriber ? 'opacity-60' : ''
      }`}
    >
      {!isProSubscriber && (
        <div className="absolute inset-0 bg-black/10 rounded-lg pointer-events-none" />
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl">{getEventTypeIcon(gig.event_type)}</span>
          <div>
            <h3 className="font-semibold text-base sm:text-lg capitalize flex items-center gap-2">
              {gig.event_type} Gig Opportunity
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Posted {format(new Date(gig.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/20">
            Public Gig
          </Badge>
          {gig.budget && (
            <Badge className="bg-green-500/20 text-green-700 border-green-500/20">
              ${gig.budget} {gig.budget_currency}
            </Badge>
          )}
        </div>
      </div>

      {/* Event Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 bg-muted/30 p-3 rounded-lg text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{format(new Date(gig.event_date), 'PPP')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{gig.event_duration} hours</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{gig.event_location}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{gig.booker_name}</span>
        </div>
      </div>

      {/* Description */}
      {gig.description && (
        <div>
          <span className="font-medium text-xs sm:text-sm">Event Description:</span>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">{gig.description}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
        <ChatButtonWithNotifications gig={gig} disabled={!isProSubscriber} />
        <Button
          onClick={() => handleAcceptGig(gig)}
          className={`w-full sm:w-auto ${
            isProSubscriber 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'bg-gray-400 hover:bg-gray-500 text-white'
          }`}
          size="sm"
        >
          <Check className="h-4 w-4 mr-2" />
          {isProSubscriber ? 'Accept Gig' : 'Upgrade to Accept'}
        </Button>
      </div>
    </div>
  );

  if (loading && isProSubscriber) {
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
    <>
      <Card className={`glass-card ${isProSubscriber ? 'border-purple-500/20' : 'border-gray-500/20'}`}>
        <CardHeader>
          <CardTitle className={`flex items-center ${isProSubscriber ? 'text-purple-700' : 'text-gray-600'}`}>
            <Sparkles className="h-5 w-5 mr-2" />
            Gig Opportunities ({gigs.length})
            {!isProSubscriber && (
              <Crown className="h-4 w-4 ml-2 text-yellow-500" />
            )}
          </CardTitle>
          <CardDescription>
            {isProSubscriber 
              ? "Public gig opportunities available for pro subscribers"
              : "Upgrade to Pro to access exclusive gig opportunities"
            }
          </CardDescription>
          {!isProSubscriber && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-yellow-600" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-800">Pro Feature</h4>
                  <p className="text-sm text-yellow-700">
                    Access exclusive gig opportunities and earn more with Pro subscription
                  </p>
                </div>
                <Button 
                  onClick={onUpgrade}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        
        {gigs.length === 0 ? (
          <CardContent className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Gig Opportunities</h3>
            <p className="text-sm text-muted-foreground">
              {isProSubscriber 
                ? "New gig opportunities will appear here when available"
                : "Upgrade to Pro to see available gig opportunities"
              }
            </p>
          </CardContent>
        ) : (
          <CardContent className="space-y-3 sm:space-y-4">
            {gigs.map((gig) => renderGigCard(gig))}
          </CardContent>
        )}
      </Card>

      {/* Manual Invoice Modal */}
      {selectedGig && isProSubscriber && (
        <ManualInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedGig(null);
          }}
          booking={selectedGig}
          isProSubscriber={isProSubscriber}
          onSuccess={handleInvoiceSuccess}
        />
      )}

      {/* Chat Modal */}
      {chatGig && isProSubscriber && (
        <ChatModal
          open={showChatModal}
          onOpenChange={setShowChatModal}
          bookingId={chatGig.id}
          talentName={chatGig.booker_name}
          eventType={chatGig.event_type}
          eventDate={chatGig.event_date}
        />
      )}
    </>
  );
}