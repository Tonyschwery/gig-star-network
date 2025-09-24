// FILE: src/pages/TalentDashboard.tsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Edit3, Crown, Eye } from "lucide-react";
import { Header } from "@/components/Header";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { TalentDashboardTabs } from "@/components/TalentDashboardTabs"; // <-- IMPORT our new component
import { SubscriptionButton } from "@/components/SubscriptionButton";
import { Badge } from "@/components/ui/badge";
import { ModeSwitch } from "@/components/ModeSwitch";

const TalentDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  
  useRealtimeNotifications();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-3 mb-1">
                 <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                   Welcome, {profile.artist_name || 'Talent'}!
                 </h1>
                 {profile.is_pro_subscriber && <Badge><Crown className="h-3 w-3 mr-1" />PRO</Badge>}
               </div>
              <p className="text-muted-foreground text-sm sm:text-base">Manage your bookings and event opportunities</p>
            </div>
            
            <div className="hidden sm:block">
              <NotificationCenter />
            </div>
          </div>
          
          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex flex-wrap gap-2 flex-1">
                <Button onClick={() => navigate('/talent-profile-edit')} size="sm">
                  <Edit3 className="h-4 w-4 mr-2" />Edit Profile
                </Button>
                <Button variant="outline" onClick={() => navigate(`/talent/${profile.id}`)} size="sm">
                  <Eye className="h-4 w-4 mr-2" />View Profile
                </Button>
                <ModeSwitch size="sm" />
                <SubscriptionButton isProSubscriber={profile.is_pro_subscriber || false} />
                <Button variant="outline" onClick={handleSignOut} size="sm">
                  <LogOut className="h-4 w-4 mr-2" />Sign Out
                </Button>
            </div>
            
            <div className="sm:hidden self-start">
              <NotificationCenter />
            </div>
          </div>
        </div>

        {/* === NEW TABBED DASHBOARD === */}
        <TalentDashboardTabs profile={profile} />

      </div>
    </div>
  );
};

export default TalentDashboard;