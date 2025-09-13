import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
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
//9pm
const TalentDashboard = () => {
  const { profile, signOut } = useAuth(); // Get profile directly from the central source
  const navigate = useNavigate();

  if (!profile) {
    // This should not be reached if ProtectedTalentRoute is working, but it's a safe fallback.
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <p>Loading profile...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{profile.artist_name}</h1>
            {profile.is_pro_subscriber && <Badge><Crown className="h-3 w-3 mr-1" />PRO</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            <ModeSwitch size="sm" />
            <Button onClick={() => navigate('/talent-dashboard/bookings')} variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />My Bookings
            </Button>
            <Button onClick={() => navigate('/talent-profile-edit')} size="sm">
              <Edit3 className="h-4 w-4 mr-2" />Edit Profile
            </Button>
            <SubscriptionButton isProSubscriber={profile.is_pro_subscriber || false} />
            <Button variant="outline" onClick={signOut} size="sm">
              <LogOut className="h-4 w-4 mr-2" />Sign Out
            </Button>
          </div>
        </div>
        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* ... Your original JSX for displaying profile info ... */}
          </CardContent>
        </Card>
        <UniversalChat />
      </div>
    </div>
  );
};

export default TalentDashboard;