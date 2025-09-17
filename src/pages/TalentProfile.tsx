import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  MapPin, 
  Music, 
  Mic, 
  User, 
  Star, 
  Calendar,
  ArrowLeft,
  ExternalLink
} from "lucide-react";
import { ProBadge } from "@/components/ProBadge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  gender?: string;
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
}

export default function TalentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [talent, setTalent] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTalent(id);
    }
  }, [id, user]);

  const fetchTalent = async (talentId: string) => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles_public')
        .select('*')
        .eq('id', talentId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching talent:', error);
        toast({ title: "Error", description: "Failed to load talent profile", variant: "destructive" });
        return;
      }

      if (!data) {
        toast({ title: "Not Found", description: "Talent profile not found", variant: "destructive" });
        navigate('/');
        return;
      }

      setTalent(data);
      
      if (user) {
        const { data: userTalentProfile } = await supabase
          .from('talent_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsOwnProfile(userTalentProfile?.id === data.id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleBookNow = () => {
    if (isOwnProfile) {
      toast({ title: "Cannot Book Yourself", description: "You cannot book yourself as a talent.", variant: "destructive" });
      return;
    }
    
    if (!user) {
      toast({ title: "Please Sign In", description: "You need to sign in to book a talent." });
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    
    setShowBookingForm(true);
  };

  // ... (Your other helper functions like getActIcon, getCurrencySymbol are here)

  if (loading) {
    // ... (Your loading skeleton JSX is here)
  }
  if (!talent) {
    // ... (Your 'Talent Not Found' JSX is here)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* ... (The entire JSX for displaying the talent profile is here) ... */}
          {/* The crucial part is the button logic: */}
          <div className="space-y-3">
              {/* This will show EITHER the Book Now button OR the Sign In to Book button */}
              {!isOwnProfile && (
                <Button 
                  className="w-full hero-button"
                  onClick={handleBookNow}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {user ? 'Book Now' : 'Sign In to Book'}
                </Button>
              )}
          </div>
        </div>
      </main>
      <Footer />

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