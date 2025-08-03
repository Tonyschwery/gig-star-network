import { useState, useEffect } from "react";
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
  Check, 
  X, 
  MessageCircle,
  CheckCircle,
  Clock3,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ManualInvoiceModal } from "./ManualInvoiceModal";
import { ChatModal } from "./ChatModal";
import { TalentChatModal } from "./TalentChatModal";
import { BookerInvoiceCard } from "./BookerInvoiceCard";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

interface BookingCardProps {
  booking: {
    id: string;
    booker_name: string;
    booker_email?: string;
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
    payment_id?: string;
    is_gig_opportunity?: boolean;
    is_public_request?: boolean;
    talent_profiles?: {
      artist_name: string;
      picture_url?: string;
      rate_per_hour: number;
      is_pro_subscriber: boolean;
    };
  };
  mode: 'talent' | 'booker';
  showActions?: boolean;
  showPaymentInterface?: boolean;
  onUpdate?: () => void;
  payment?: any;
  isProSubscriber?: boolean;
  talentId?: string;
  gigApplicationId?: string;
}

export function BookingCard({ 
  booking, 
  mode, 
  showActions = true, 
  showPaymentInterface = false,
  onUpdate,
  payment,
  isProSubscriber,
  talentId,
  gigApplicationId
}: BookingCardProps) {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [hasConversation, setHasConversation] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasUnread } = useUnreadMessages(booking.id);
  const { unreadCount } = useUnreadNotifications();

  // Check if conversation exists
  useEffect(() => {
    const checkConversation = async () => {
      try {
        let conversationExists = false;
        
        if (gigApplicationId) {
          // For gig applications, check by gig_application_id
          const { data } = await supabase
            .from('conversations')
            .select('id')
            .eq('gig_application_id', gigApplicationId)
            .maybeSingle();
          conversationExists = !!data;
        } else {
          // For direct bookings, check by booking_id
          const { data } = await supabase
            .from('conversations')
            .select('id')
            .eq('booking_id', booking.id)
            .maybeSingle();
          conversationExists = !!data;
        }
        
        setHasConversation(conversationExists);
      } catch (error) {
        console.error('Error checking conversation:', error);
      }
    };
    
    checkConversation();
  }, [booking.id, booking.status, gigApplicationId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/20';
      case 'approved':
        return 'bg-green-500/20 text-green-700 border-green-500/20';
      case 'pending_approval':
        return 'bg-orange-500/20 text-orange-700 border-orange-500/20';
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/20';
      case 'completed':
        return 'bg-purple-500/20 text-purple-700 border-purple-500/20';
      case 'interested':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/20';
      case 'invoice_sent':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/20';
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
      case 'pending_approval':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'interested':
        return <Clock3 className="h-4 w-4" />;
      case 'invoice_sent':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock3 className="h-4 w-4" />;
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'pending_approval':
        return 'Pending Approval';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'interested':
        return 'Applied';
      case 'invoice_sent':
        return 'Invoice Sent';
      default:
        return status;
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

  const handleAccept = () => {
    setShowInvoiceModal(true);
  };

  const handleDecline = async () => {
    try {
      if (gigApplicationId) {
        // Decline gig application
        const { error } = await supabase
          .from('gig_applications')
          .update({ status: 'declined' })
          .eq('id', gigApplicationId);
        if (error) throw error;
      } else {
        // Decline booking
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'declined' })
          .eq('id', booking.id);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Request declined",
      });
      
      onUpdate?.();
    } catch (error) {
      console.error('Error declining:', error);
      toast({
        title: "Error",
        description: "Failed to decline request",
        variant: "destructive",
      });
    }
  };

  const handleOpenChat = () => {
    setShowChatModal(true);
  };

  const handleInvoiceSuccess = () => {
    setShowInvoiceModal(false);
    onUpdate?.();
  };

  // Chat Button Component
  const ChatButton = ({ variant = "outline", size = "sm" }: { variant?: any, size?: any }) => {
    // Chat is always available - conversations will be created on demand
    const canChat = true;
    
    return (
      <Button
        onClick={handleOpenChat}
        variant={variant}
        size={size}
        className="relative flex-shrink-0"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Chat</span>
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

  return (
    <>
      <div className="border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getEventTypeIcon(booking.event_type)}</span>
              <h3 className="font-semibold capitalize">
                {booking.event_type} {booking.is_gig_opportunity ? 'Gig' : 'Event'}
              </h3>
              <Badge className={getStatusColor(booking.status)}>
                {getStatusIcon(booking.status)}
                <span className="ml-1">{getStatusDisplay(booking.status)}</span>
              </Badge>
              {booking.is_gig_opportunity && (
                <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/20">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Gig
                </Badge>
              )}
            </div>
            
            {/* Talent/Booker Info */}
            {mode === 'booker' && booking.talent_profiles && (
              <div className="bg-muted/30 p-3 rounded-lg">
                <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Talent: {booking.talent_profiles.artist_name}
                </div>
                {booking.status === 'approved' && (
                  <div className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Approved! Payment required to confirm booking.
                  </div>
                )}
                {booking.status === 'pending_approval' && (
                  <div className="text-sm text-orange-700 dark:text-orange-300 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Invoice sent! Please review and pay to confirm.
                  </div>
                )}
                {booking.status === 'confirmed' && (
                  <div className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Confirmed and paid!
                  </div>
                )}
              </div>
            )}
            
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
                <span>Created {format(new Date(booking.created_at), 'MMM d, yyyy')}</span>
              </div>
            </div>

            {showActions && (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-foreground">Full Address:</span>
                  <p className="text-muted-foreground mt-1">{booking.event_address}</p>
                </div>
                {mode === 'talent' && booking.booker_email && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Contact Email:</span>
                    <p className="text-muted-foreground mt-1 break-all">{booking.booker_email}</p>
                  </div>
                )}
                {booking.description && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Event Description:</span>
                    <p className="text-muted-foreground mt-1">{booking.description}</p>
                  </div>
                )}
                {booking.budget && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Budget:</span>
                    <p className="text-muted-foreground mt-1">
                      {booking.budget} {booking.budget_currency || 'USD'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <ChatButton variant="outline" size="sm" />
          
          {mode === 'booker' && booking.talent_id && (
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
          )}

          {mode === 'talent' && showActions && (
            <>
              <Button
                onClick={handleDecline}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Check className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Accept & Send Invoice</span>
                <span className="sm:hidden">Accept</span>
              </Button>
            </>
          )}
        </div>

        {/* Payment Interface for approved bookings */}
        {showPaymentInterface && payment && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <BookerInvoiceCard
              booking={booking}
              payment={payment}
              onPaymentUpdate={onUpdate}
            />
          </div>
        )}
      </div>

      {/* Manual Invoice Modal */}
      <ManualInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        booking={{ ...booking, booker_email: booking.booker_email || '' }}
        isProSubscriber={isProSubscriber || false}
        onSuccess={handleInvoiceSuccess}
        gigApplicationId={gigApplicationId}
      />

      {/* Chat Modal */}
      {mode === 'talent' ? (
        gigApplicationId ? (
          <TalentChatModal
            open={showChatModal}
            onOpenChange={setShowChatModal}
            gigApplicationId={gigApplicationId}
            eventType={booking.event_type}
            eventDate={booking.event_date}
          />
        ) : (
          <ChatModal
            open={showChatModal}
            onOpenChange={setShowChatModal}
            bookingId={booking.id}
            talentName={booking.booker_name}
            eventType={booking.event_type}
            eventDate={booking.event_date}
          />
        )
      ) : (
        <ChatModal
          open={showChatModal}
          onOpenChange={setShowChatModal}
          bookingId={booking.id}
          talentName={booking.talent_profiles?.artist_name || "Talent"}
          talentImageUrl={booking.talent_profiles?.picture_url}
          eventType={booking.event_type}
          eventDate={booking.event_date}
        />
      )}
    </>
  );
}