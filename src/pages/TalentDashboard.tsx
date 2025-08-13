import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Edit3, 
  MapPin, 
  DollarSign, 
  ExternalLink,
  LogOut,
  Camera,
  Crown
} from "lucide-react";

import { NotificationCenter } from "@/components/NotificationCenter";
import { TalentDashboardTabs } from "@/components/TalentDashboardTabs";
import { UniversalChat } from "@/components/UniversalChat";

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
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the default bookings sub-route
    navigate('/talent-dashboard/bookings', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        <NotificationCenter />
        <TalentDashboardTabs />
        <UniversalChat />
      </div>
    </div>
  );
};

export default TalentDashboard;