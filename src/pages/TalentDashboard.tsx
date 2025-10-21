// FILE: src/pages/TalentDashboard.tsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth"; // Make sure this hook exports 'isLoading'
import { LogOut, Edit3, Crown, Eye } from "lucide-react";
import { Header } from "@/components/Header";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { TalentDashboardTabs } from "@/components/TalentDashboardTabs";
import { SubscriptionButton } from "@/components/SubscriptionButton";
import { ProBadge } from "@/components/ProBadge";
import { Badge } from "@/components/ui/badge";
import { ModeSwitch } from "@/components/ModeSwitch";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react"; // Import a loading spinner

const TalentDashboard = () => {
  // --- FIX 1: Get the 'isLoading' state from your useAuth hook ---
  // (If your hook calls it 'loading' or 'authLoading', use that name)
  const { user, profile, signOut, isLoading } = useAuth();

  const navigate = useNavigate();
  const { unreadCount: chatUnreadCount } = useUnreadMessages();

  useRealtimeNotifications();

  // --- FIX 2: Modify this useEffect ---
  useEffect(() => {
    // Only run this check *after* the hook is done loading
    if (!isLoading) {
      // NOW we can safely check if the user is missing
      if (!user) {
        navigate("/login");
      }
    }
  }, [user, isLoading, navigate]); // Add 'isLoading' to the dependency array

  // Cleanup expired bookings (this is fine, but let's add a check)
  useEffect(() => {
    const cleanupExpired = async () => {
      try {
        const { error } = await supabase.functions.invoke("cleanup-expired-bookings");
        if (error) console.error("Cleanup error:", error);
      } catch (err) {
        console.error("Failed to cleanup expired bookings:", err);
      }
    };

    // Only run cleanup if the user is loaded
    if (user) {
      cleanupExpired();
    }
  }, [user]); // This useEffect is just for cleanup

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // --- FIX 3: Use 'isLoading' for your main loading state ---
  // This will show the spinner while useAuth is working,
  // and *before* the redirect check happens.
  if (isLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {/* Use a consistent spinner */}
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  // --- If we get here, isLoading is false AND we have a user/profile ---

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                  Welcome, {profile.artist_name || "Talent"}!
                </h1>
                {profile.is_pro_subscriber && <ProBadge size="sm" />}
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">Manage your bookings and event opportunities</p>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <NotificationCenter />
              {chatUnreadCount > 0 && (
                <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {chatUnreadCount} Chat{chatUnreadCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex flex-wrap gap-2 flex-1">
              <Button onClick={() => navigate("/talent-profile-edit")} size="sm">
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" onClick={() => navigate(`/talent/${profile.id}`)} size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </Button>
              <ModeSwitch size="sm" />
              <SubscriptionButton isProSubscriber={profile.is_pro_subscriber || false} />
              <Button variant="outline" onClick={handleSignOut} size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            <div className="sm:hidden self-start flex flex-col gap-2">
              <NotificationCenter />
              {chatUnreadCount > 0 && (
                <Badge variant="destructive" className="animate-pulse flex items-center gap-1 w-fit">
                  <MessageCircle className="h-3 w-3" />
                  {chatUnreadCount} Chat{chatUnreadCount !== 1 ? "s" : ""}
                </Badge>
              )}
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
