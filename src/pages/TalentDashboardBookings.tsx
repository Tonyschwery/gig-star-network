import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Edit3, Crown } from "lucide-react";

import { Header } from "@/components/Header";
import { NotificationCenter } from "@/components/NotificationCenter";
import { BookingRequests } from "@/components/BookingRequests";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
//gemini 14 sept
interface TalentProfile {
  id: string;
  artist_name: string;
  is_pro_subscriber?: boolean;
}

const TalentDashboardBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useRealtimeNotifications();

  useEffect(() => {
    if (user) {
      const fetchFullProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('talent_profiles')
            .select('id, artist_name, is_pro_subscriber')
            .eq('user_id', user.id)
            .single();
          if (error) throw error;
          setProfile(data);
        } catch (err) {
          console.error("Failed to fetch talent profile data:", (err as Error).message);
          toast({
            title: "Error",
            description: "Could not load your bookings data.",
            variant: "destructive",
          });
          navigate('/talent-dashboard');
        } finally {
          setLoading(false);
        }
      };
      fetchFullProfile();
    }
  }, [user, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return null; 
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                  Direct Bookings - {profile.artist_name}
                </h1>
                {profile.is_pro_subscriber && (
                  <Badge className="pro-badge">
                    <Crown className="h-3 w-3 mr-1" />
                    PRO
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">Manage your direct booking requests</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/talent-dashboard')} variant="outline" size="sm">
              ← Back to Dashboard
            </Button>
            <Button onClick={() => navigate('/talent-profile-edit')} className="flex-shrink-0" size="sm">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <NotificationCenter />
        </div>

        <BookingRequests 
          talentId={profile.id}
          isProSubscriber={profile.is_pro_subscriber || false}
        />

        {/* The <UniversalChat /> component has been REMOVED from this page */}
      </div>
    </div>
  );
};

export default TalentDashboardBookings;