import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Edit3, 
  LogOut,
  Crown,
  Lock,
  Sparkles
} from "lucide-react";

import { ProSubscriptionDialog } from "@/components/ProSubscriptionDialog";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ModeSwitch } from "@/components/ModeSwitch";
import { GigOpportunitiesIntegrated } from "@/components/GigOpportunitiesIntegrated";
import { Header } from "@/components/Header";

interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  gender: string;
  age: string;
  location?: string;
  rate_per_hour?: number;
  currency: string;
  music_genres: string[];
  custom_genre?: string;
  picture_url?: string;
  gallery_images?: string[];
  soundcloud_link?: string;
  youtube_link?: string;
  biography: string;
  nationality: string;
  created_at: string;
  is_pro_subscriber?: boolean;
  subscription_started_at?: string;
  subscription_status?: string;
}

const TalentDashboardGigs = () => {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProDialog, setShowProDialog] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTalentProfile();
  }, [user, navigate]);

  const fetchTalentProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (!data) {
        navigate('/talent-onboarding');
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCancelSubscription = async () => {
    if (!user || !session) return;

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to open customer portal');
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isProUser = profile?.is_pro_subscriber || profile?.subscription_status === 'pro';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <Button onClick={() => navigate('/talent-onboarding')}>
            Complete Your Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                  Gig Opportunities - {profile.artist_name}
                </h1>
                {isProUser && (
                  <Badge className="pro-badge">
                    <Crown className="h-3 w-3 mr-1" />
                    PRO
                  </Badge>
                )}
                {!isProUser && (
                  <Badge variant="secondary" className="bg-muted">
                    <Lock className="h-3 w-3 mr-1" />
                    Free Plan
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                {isProUser 
                  ? "Browse and apply to premium gig opportunities" 
                  : "Upgrade to Pro to access premium gig opportunities"
                }
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <ModeSwitch size="sm" />
            
            <Button
              onClick={() => navigate('/talent-dashboard/bookings')}
              variant="outline"
              size="sm"
            >
              Direct Bookings
            </Button>
            
            <Button
              onClick={() => navigate('/talent-profile-edit')}
              className="flex-shrink-0"
              size="sm"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Edit Profile</span>
              <span className="sm:hidden">Edit</span>
            </Button>
            
            {!isProUser ? (
              <Button 
                onClick={() => setShowProDialog(true)}
                className="hero-button flex-shrink-0"
                size="sm"
              >
                <Crown className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Subscribe to Pro</span>
                <span className="sm:hidden">Pro</span>
              </Button>
            ) : (
              <Button 
                onClick={handleCancelSubscription}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 flex-shrink-0"
                size="sm"
              >
                <span className="hidden sm:inline">Cancel Pro</span>
                <span className="sm:hidden">Cancel</span>
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="flex-shrink-0"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Logout</span>
            </Button>
          </div>
        </div>

        {/* Notification Center */}
        <div className="mb-6">
          <NotificationCenter />
        </div>

        {/* Pro Subscription Gate */}
        {!isProUser && (
          <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Premium Gig Opportunities
              </CardTitle>
              <CardDescription>
                Unlock access to exclusive, high-paying gig opportunities with Pro subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => setShowProDialog(true)}
                className="hero-button"
                size="lg"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Gig Opportunities Component */}
        <GigOpportunitiesIntegrated 
          isProSubscriber={isProUser}
          onUpgrade={() => setShowProDialog(true)}
          talentId={profile.id}
        />

        {/* Pro Subscription Dialog */}
        <ProSubscriptionDialog
          open={showProDialog}
          onOpenChange={setShowProDialog}
          onSubscribe={() => {
            fetchTalentProfile();
          }}
          profileId={profile.id}
        />
      </div>
    </div>
  );
};

export default TalentDashboardGigs;