import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, Mail, User, Check, X, MessageCircle, Crown, Sparkles } from "lucide-react";
import { ManualInvoiceModal } from "./ManualInvoiceModal";

import { BookingCard } from "./BookingCard";
import { format } from "date-fns";

import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

interface GigApplication {
  id: string;
  gig_id: string;
  talent_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  gig: {
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
  };
}

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

interface GigOpportunitiesIntegratedProps {
  isProSubscriber: boolean;
  onUpgrade: () => void;
  talentId: string;
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

// Chat for gig applications has been removed with the new universal chat system.

export function GigOpportunitiesIntegrated({ isProSubscriber, onUpgrade, talentId }: GigOpportunitiesIntegratedProps) {
  const [availableGigs, setAvailableGigs] = useState<GigOpportunity[]>([]);
  const [pendingApplications, setPendingApplications] = useState<GigApplication[]>([]);
  const [confirmedApplications, setConfirmedApplications] = useState<GigApplication[]>([]);
  const [pastApplications, setPastApplications] = useState<GigApplication[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'pending' | 'confirmed' | 'past'>('available');
  const [loading, setLoading] = useState(true);
  const [selectedGig, setSelectedGig] = useState<GigOpportunity | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [gigApplicationId, setGigApplicationId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isProSubscriber) {
      fetchAllGigData();
    } else {
      setLoading(false);
    }
  }, [isProSubscriber, talentId]);

  const fetchAllGigData = async () => {
    try {
      // Fetch available gig opportunities
      const { data: availableData, error: availableError } = await supabase
        .from('bookings')
        .select('*')
        .eq('is_public_request', true)
        .eq('is_gig_opportunity', true)
        .eq('status', 'pending')
        .is('talent_id', null)
        .order('created_at', { ascending: false });

      if (availableError) throw availableError;
      setAvailableGigs(availableData || []);

      // Fetch gig applications for this talent
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('gig_applications')
        .select(`
          *,
          gig:bookings!gig_applications_gig_id_fkey (
            id,
            booker_name,
            booker_email,
            event_date,
            event_duration,
            event_location,
            event_address,
            event_type,
            description,
            status,
            created_at,
            user_id,
            budget,
            budget_currency,
            is_public_request,
            is_gig_opportunity
          )
        `)
        .eq('talent_id', talentId)
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;
      
      const applications = applicationsData || [];
      const now = new Date();
      
      // Filter applications by status and date
      setPendingApplications(applications.filter(app => 
        app.status === 'interested' || app.status === 'invoice_sent'
      ));
      
      setConfirmedApplications(applications.filter(app => 
        app.status === 'confirmed' && 
        new Date(app.gig.event_date) >= now
      ));
      
      // MASTER TASK 1: Past events should only show gigs where event_date is in the past, regardless of status
      setPastApplications(applications.filter(app => 
        new Date(app.gig.event_date) < now
      ));

    } catch (error) {
      console.error('Error fetching gig data:', error);
      toast({
        title: "Error",
        description: "Failed to load gig data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrGetGigApplication = async (gigId: string): Promise<string> => {
    try {
      // Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // Fetch talent profile to get talent_id
      const { data: talentProfile, error: profileError } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!talentProfile) throw new Error('Talent profile not found');

      const currentTalentId = talentProfile.id;

      // First check if application already exists
      const { data: existingApp, error: checkError } = await supabase
        .from('gig_applications')
        .select('id')
        .eq('gig_id', gigId)
        .eq('talent_id', currentTalentId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingApp) {
        return existingApp.id;
      }

      // Create new application
      const { data: newApp, error: createError } = await supabase
        .from('gig_applications')
        .insert({
          gig_id: gigId,
          talent_id: currentTalentId,
          status: 'interested'
        })
        .select('id')
        .single();

      if (createError) throw createError;
      return newApp.id;
    } catch (error) {
      console.error('Error creating gig application:', error);
      throw new Error('Failed to create gig application');
    }
  };

  const handleAcceptGig = async (gig: GigOpportunity) => {
    if (!isProSubscriber) {
      onUpgrade();
      return;
    }

    try {
      const applicationId = await createOrGetGigApplication(gig.id);
      setGigApplicationId(applicationId);
      setSelectedGig(gig);
      setShowInvoiceModal(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept gig",
        variant: "destructive",
      });
    }
  };

// Chat via conversations has been removed in favor of the new universal chat.

  // MASTER TASK 1: Remove handleChatGig function - chat is only available after invoice sent

  const handleInvoiceSuccess = () => {
    fetchAllGigData(); // Refresh all data
    setShowInvoiceModal(false);
    setSelectedGig(null);
    setGigApplicationId(null);
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

  const renderAvailableGigCard = (gig: GigOpportunity) => (
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
          <span className="font-medium">Duration: {gig.event_duration} hours</span>
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

      {/* TASK 1: Action Buttons - Add Chat with Booker functionality */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
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
          {isProSubscriber ? 'Accept & Send Invoice' : 'Upgrade to Accept'}
        </Button>
      </div>
    </div>
  );

  const renderGigApplicationCard = (gigApplication: GigApplication, showActions: boolean = true) => {
    // Convert gig application to booking format for BookingCard
    const bookingData = {
      id: gigApplication.gig.id,
      booker_name: gigApplication.gig.booker_name,
      booker_email: gigApplication.gig.booker_email,
      event_date: gigApplication.gig.event_date,
      event_duration: gigApplication.gig.event_duration,
      event_location: gigApplication.gig.event_location,
      event_address: gigApplication.gig.event_address,
      event_type: gigApplication.gig.event_type,
      description: gigApplication.gig.description,
      status: gigApplication.status,
      created_at: gigApplication.created_at,
      user_id: gigApplication.gig.user_id,
      budget: gigApplication.gig.budget,
      budget_currency: gigApplication.gig.budget_currency,
      is_gig_opportunity: true,
      is_public_request: true,
    };
    
    return (
      <BookingCard
        key={gigApplication.id}
        booking={bookingData}
        mode="talent"
        onUpdate={fetchAllGigData}
        isProSubscriber={isProSubscriber}
      />
    );
  };

  const renderEmptyState = (tab: string) => (
    <Card className="glass-card">
      <CardContent className="text-center py-8">
        <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">
          {tab === 'available' ? 'No Available Gigs' :
           tab === 'pending' ? 'No Pending Applications' :
           tab === 'confirmed' ? 'No Upcoming Gigs' :
           'No Past Gigs'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {tab === 'available' ? 'New gig opportunities will appear here when available' :
           tab === 'pending' ? 'Your gig applications awaiting approval will appear here' :
           tab === 'confirmed' ? 'Your confirmed gigs will appear here' :
           'Your completed gigs will appear here'}
        </p>
      </CardContent>
    </Card>
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
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === 'available' ? 'default' : 'outline'}
            onClick={() => setActiveTab('available')}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Available Gigs ({isProSubscriber ? availableGigs.length : mockGigs.length})
          </Button>
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Pending Approval ({pendingApplications.length})
          </Button>
          <Button
            variant={activeTab === 'confirmed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('confirmed')}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Upcoming / Confirmed ({confirmedApplications.length})
          </Button>
          <Button
            variant={activeTab === 'past' ? 'default' : 'outline'}
            onClick={() => setActiveTab('past')}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Past Events ({pastApplications.length})
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'available' && (
          <Card className={`glass-card ${isProSubscriber ? 'border-purple-500/20' : 'border-gray-500/20'}`}>
            <CardHeader>
              <CardTitle className={`flex items-center ${isProSubscriber ? 'text-purple-700' : 'text-gray-600'}`}>
                <Sparkles className="h-5 w-5 mr-2" />
                Available Gig Opportunities ({isProSubscriber ? availableGigs.length : mockGigs.length})
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
            
            {(isProSubscriber ? availableGigs : mockGigs).length === 0 ? (
              renderEmptyState('available')
            ) : (
              <CardContent className="space-y-3 sm:space-y-4">
                {(isProSubscriber ? availableGigs : mockGigs).map((gig) => renderAvailableGigCard(gig))}
              </CardContent>
            )}
          </Card>
        )}

        {activeTab === 'pending' && (
          pendingApplications.length === 0 ? renderEmptyState('pending') : (
            <Card className="glass-card border-yellow-500/20">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-700">
                  <Mail className="h-5 w-5 mr-2" />
                  Pending Approval ({pendingApplications.length})
                </CardTitle>
                <CardDescription>
                  Your gig applications that are pending approval
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {pendingApplications.map((gigApp) => renderGigApplicationCard(gigApp, true))}
              </CardContent>
            </Card>
          )
        )}

        {activeTab === 'confirmed' && (
          confirmedApplications.length === 0 ? renderEmptyState('confirmed') : (
            <Card className="glass-card border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <Check className="h-5 w-5 mr-2" />
                  Upcoming / Confirmed Gigs ({confirmedApplications.length})
                </CardTitle>
                <CardDescription>
                  Your confirmed upcoming gigs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {confirmedApplications.map((gigApp) => renderGigApplicationCard(gigApp, false))}
              </CardContent>
            </Card>
          )
        )}

        {activeTab === 'past' && (
          pastApplications.length === 0 ? renderEmptyState('past') : (
            <Card className="glass-card border-gray-500/20">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-700">
                  <Calendar className="h-5 w-5 mr-2" />
                  Past Events ({pastApplications.length})
                </CardTitle>
                <CardDescription>
                  Your completed gigs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {pastApplications.map((gigApp) => renderGigApplicationCard(gigApp, false))}
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Manual Invoice Modal */}
      {selectedGig && isProSubscriber && gigApplicationId && (
        <ManualInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedGig(null);
            setGigApplicationId(null);
          }}
          booking={selectedGig}
          isProSubscriber={isProSubscriber}
          onSuccess={handleInvoiceSuccess}
          gigApplicationId={gigApplicationId}
        />
      )}

    </>
  );
}