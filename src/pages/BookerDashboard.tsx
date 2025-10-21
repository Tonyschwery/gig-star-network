import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth"; // Make sure this hook exports 'isLoading'
import { LogOut } from "lucide-react";
import { Header } from "@/components/Header";
import { BookerDashboardTabs } from "@/components/BookerDashboardTabs";
import { UniversalChat } from "@/components/UniversalChat";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react"; // Import a loading spinner

const BookerDashboard = () => {
  const { user, signOut, loading } = useAuth();

  const navigate = useNavigate();
  const { unreadCount: chatUnreadCount } = useUnreadMessages();

  // Enable real-time notifications
  useRealtimeNotifications();

  // ProtectedRoute handles authentication redirects - no need to duplicate here
  useEffect(() => {
    if (!loading && !user) {
      console.warn("[BookerDashboard] No user found, ProtectedRoute should handle redirect");
    }
  }, [user, loading]);

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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {/* Use a consistent spinner */}
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  // --- If we get here, isLoading is false AND we have a user ---

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                Welcome, {user?.email?.split("@")[0] || "Guest"}!
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">Manage your event bookings</p>
            </div>

            {/* Notification Center - Desktop */}
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
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-shrink-0 border-2 border-blue-500 hover:bg-blue-500/10 hover:border-blue-600 transition-all"
                size="default"
              >
                Browse Talents
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/your-event")}
                className="flex-shrink-0 border-2 border-green-500 hover:bg-green-500/10 hover:border-green-600 transition-all"
                size="default"
              >
                Tell us about your event
              </Button>
              <Button variant="outline" onClick={handleSignOut} className="flex-shrink-0" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Logout</span>
              </Button>
            </div>

            {/* Notification Center - Mobile */}
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

        {/* Tabbed Dashboard */}
        <BookerDashboardTabs userId={user.id} />

        {/* Universal Chat Floating Button */}
      </div>
    </div>
  );
};

export default BookerDashboard;
