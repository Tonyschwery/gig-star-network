// FILE: src/pages/TalentProfile.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom"; // Import useLocation
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { BookingForm } from "@/components/BookingForm";
import { SoundCloudEmbed } from "@/components/SoundCloudEmbed";
import { 
  MapPin, Music, Mic, User, Star, Calendar, ArrowLeft, ExternalLink 
} from "lucide-react";
import { ProBadge } from "@/components/ProBadge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TalentProfileData {
  id: string;
  artist_name: string;
  act: string;
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
  is_pro_subscriber?: boolean;
}

export default function TalentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation(); // Get the current location object
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [talent, setTalent] = useState<TalentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTalent(id);
    }
  }, [id, user]); // Add user to dependency array to re-check isOwnProfile on login

  const fetchTalent = async (talentId: string) => {
    // ... fetchTalent logic is correct and unchanged
  };

  const handleBookNow = () => {
    if (isOwnProfile) {
      toast({ title: "Cannot Book Yourself", variant: "destructive" });
      return;
    }
    
    // The useAuth hook handles the logged-in check now, so this logic is simpler
    setShowBookingForm(true);
  };

  // ... (getActIcon and getCurrencySymbol functions are unchanged) ...

  if (loading) {
    // ... (loading state is unchanged) ...
  }
  if (!talent) {
    // ... (not found state is unchanged) ...
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* ... (The top part of the profile is unchanged) ... */}
          
          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              {/* ... (Rate display is unchanged) ... */}
              
              <div className="space-y-3">
                {/* Button for LOGGED IN users */}
                {user && !isOwnProfile && (
                  <Button className="w-full hero-button" onClick={handleBookNow}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Now
                  </Button>
                )}
                
                {/* THE FIX: Button for LOGGED OUT users now uses the correct redirect method */}
                {!user && (
                  <Button 
                    className="w-full hero-button"
                    onClick={() => navigate('/auth', { state: { from: location, mode: 'booker' } })}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Sign In to Book
                  </Button>
                )}
              </div>
            </Card>
            {/* ... (Rest of the sidebar is unchanged) ... */}
          </div>
        </div>
      </main>
      <Footer />

      {/* Booking Form Modal */}
      {showBookingForm && talent && user && (
        <BookingForm
          talentId={talent.id}
          talentName={talent.artist_name}
          onClose={() => setShowBookingForm(false)}
          onSuccess={() => {
            setShowBookingForm(false);
            toast({
              title: "Success!",
              description: "Your booking request has been sent successfully.",
            });
          }}
        />
      )}
    </div>
  );
}