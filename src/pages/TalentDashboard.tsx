
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
  ExternalLink,
  LogOut,
  Crown,
  Calendar,
  Music
} from "lucide-react";

import { Header } from "@/components/Header";
import { NotificationCenter } from "@/components/NotificationCenter";
import { UniversalChat } from "@/components/UniversalChat";
import { ProSubscriptionDialog } from "@/components/ProSubscriptionDialog";
import { ModeSwitch } from "@/components/ModeSwitch";

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
}

const TalentDashboard = () => {
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
      // First check if user has a talent profile using the secure function
      const { data: hasProfile, error: checkError } = await supabase.rpc('user_has_talent_profile');
      
      if (checkError || !hasProfile) {
        console.error('Error checking profile or no profile found:', checkError);
        navigate('/talent-onboarding');
        return;
      }

      // Then fetch the full profile data
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        navigate('/talent-onboarding');
        return;
      }

      if (!data) {
        navigate('/talent-onboarding');
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error:', error);
      navigate('/talent-onboarding');
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
                  Welcome back, {profile.artist_name}
                </h1>
                {profile.is_pro_subscriber && (
                  <Badge className="pro-badge">
                    <Crown className="h-3 w-3 mr-1" />
                    PRO
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">Manage your talent profile and bookings</p>
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
              <Calendar className="h-4 w-4 mr-2" />
              My Bookings
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
            
            {!profile.is_pro_subscriber ? (
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

        {/* Dashboard Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
              <Calendar className="h-4 w-4 muted" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-2xl font-bold"
                  onClick={() => navigate('/talent-dashboard/bookings')}
                >
                  View All
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Manage your bookings and requests</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
              <Edit3 className="h-4 w-4 muted" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-2xl font-bold"
                  onClick={() => navigate('/talent-profile-edit')}
                >
                  Edit Profile
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Keep your profile updated and attractive</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your talent profile and settings</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/talent-profile-edit')}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/talent-dashboard/bookings')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              View Bookings
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open(`/talent/${profile.id}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Profile
            </Button>
          </CardContent>
        </Card>

        {/* Pro Subscription Dialog */}
        <ProSubscriptionDialog
          open={showProDialog}
          onOpenChange={setShowProDialog}
          onSubscribe={() => {
            fetchTalentProfile();
          }}
          profileId={profile.id}
        />

        {/* Universal Chat */}
        <UniversalChat />
      </div>
    </div>
  );
};

export default TalentDashboard;
