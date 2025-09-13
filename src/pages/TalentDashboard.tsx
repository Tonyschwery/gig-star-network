import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
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
import { UniversalChat } from "@/components/UniversalChat";
import { SubscriptionButton } from "@/components/SubscriptionButton";
import { ModeSwitch } from "@/components/ModeSwitch";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
//gemini 13 september
interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  location?: string;
  music_genres: string[];
  picture_url?: string;
  is_pro_subscriber?: boolean;
  // Add any other fields you need for display here
}

const TalentDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useRealtimeNotifications();

  useEffect(() => {
    // This component is wrapped by `ProtectedTalentRoute`, so we can assume a `user` with a profile exists.
    // Its only job is to fetch the full profile data needed for display.
    const fetchTalentProfile = async () => {
      if (!user) {
        setLoading(false);
        return; // Failsafe, should be handled by the protected route.
      }

      try {
        const { data, error } = await supabase
          .from('talent_profiles')
          .select('*') // Select all columns for the dashboard display
          .eq('user_id', user.id)
          .single();

        if (error) throw error; // Let the catch block handle any errors.

        setProfile(data);
      } catch (err) {
        const error = err as Error;
        console.error('Error fetching full talent profile:', error.message);
        toast({
          title: "Error",
          description: "Could not load your dashboard. Please try again.",
          variant: "destructive",
        });
        navigate('/'); // Redirect to a safe page on failure.
      } finally {
        setLoading(false);
      }
    };

    fetchTalentProfile();
  }, [user, navigate, toast]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If after loading the profile is still null, a redirect is likely in progress.
  if (!profile) {
    return null; 
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                  Welcome back, {profile.artist_name}
                </h1>
                {profile.is_pro_subscriber && (
                  <Badge className="pro-badge">
                    <Crown className="h-3 w-3 mr-1" />
                    PRO
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">Manage your talent profile and bookings</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* This is the switch you wanted to restore */}
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
              Edit Profile
            </Button>
            
            <SubscriptionButton
              isProSubscriber={profile.is_pro_subscriber || false}
              onSubscriptionChange={fetchTalentProfile}
            />
            
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="flex-shrink-0"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {profile.picture_url && (
                  <img 
                    src={profile.picture_url} 
                    alt={profile.artist_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="text-lg font-semibold">{profile.artist_name}</h3>
                  <p className="text-muted-foreground">{profile.act}</p>
                  {profile.location && (
                    <p className="text-sm text-muted-foreground">{profile.location}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.music_genres.slice(0, 3).map((genre, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Music className="h-3 w-3 mr-1" />
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/talent/${profile.id}`)}
                className="w-full sm:w-auto"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        <UniversalChat />
      </div>
    </div>
  );
};

export default TalentDashboard;