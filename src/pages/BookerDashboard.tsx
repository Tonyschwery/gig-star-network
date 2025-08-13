import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { BookerDashboardTabs } from "@/components/BookerDashboardTabs";
import { UniversalChat } from "@/components/UniversalChat";

const BookerDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                Welcome, {user?.email?.split('@')[0] || 'Guest'}!
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">Manage your event bookings</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex-shrink-0"
              size="sm"
            >
              Browse Talents
            </Button>
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

        {/* Tabbed Dashboard */}
        <BookerDashboardTabs userId={user.id} />

        {/* Universal Chat Floating Button */}
        <UniversalChat />
      </div>
    </div>
  );
};

export default BookerDashboard;