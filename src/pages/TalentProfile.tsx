import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProBadge } from "@/components/ProBadge";
import { BookingForm } from "@/components/BookingForm";
import { Calendar, MapPin, Clock, Star, Music, User, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SoundCloudEmbed } from "@/components/SoundCloudEmbed";
import { YouTubePlayer } from "@/components/YouTubePlayer";

interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  age: string;
  gender: string;
  nationality: string;
  biography: string;
  music_genres: string[];
  custom_genre?: string;
  rate_per_hour: number;
  currency: string;
  location: string;
  picture_url?: string;
  gallery_images: string[];
  soundcloud_link?: string;
  youtube_link?: string;
  is_pro_subscriber: boolean;
  created_at: string;
}

export default function TalentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const bookButtonRef = useRef<HTMLButtonElement>(null);
  
  const [talent, setTalent] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const isOwnProfile = user && profile?.id === id;

  // Format talent act with proper capitalization and styling
  const formatTalentAct = (act: string) => {
    if (act.toLowerCase() === 'dj') return 'DJ';
    return act.charAt(0).toUpperCase() + act.slice(1);
  };

  useEffect(() => {
    const fetchTalent = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('talent_profiles_public')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching talent:', error);
          toast({
            title: "Error",
            description: "Could not load talent profile",
            variant: "destructive"
          });
        } else {
          setTalent(data);
        }
      } catch (err) {
        console.error('Error:', err);
        toast({
          title: "Error",
          description: "Could not load talent profile",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTalent();
  }, [id, toast]);

  // Auto-scroll to Book button on page load
  useEffect(() => {
    if (!loading && talent && bookButtonRef.current && !isOwnProfile) {
      const scrollToButton = () => {
        const button = bookButtonRef.current;
        if (!button) return;

        const rect = button.getBoundingClientRect();
        const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;

        // On mobile: always scroll. On desktop: only scroll if not visible
        if (isMobile || !isInViewport) {
          button.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      // Small delay to ensure page is fully rendered
      const timer = setTimeout(scrollToButton, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, talent, isOwnProfile, isMobile]);

  // Auto-open booking form if redirected from auth with intent
  useEffect(() => {
    if (location.state?.openBookingForm && user && talent) {
      setShowBookingForm(true);
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, user, talent, navigate, location.pathname]);

  const handleBookNow = () => {
    if (!user) {
      // Store booking intent in localStorage for post-auth redirect
      localStorage.setItem('bookingIntent', JSON.stringify({ 
        talentId: id, 
        talentName: talent?.artist_name 
      }));
      navigate('/auth', { state: { intent: 'booking-form', talentId: id, mode: 'booker' } });
    } else {
      setShowBookingForm(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Talent not found</h1>
            <p className="text-muted-foreground mb-8">The talent profile you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <div className="w-48 h-48 rounded-lg overflow-hidden bg-muted">
                    {talent.picture_url ? (
                      <img 
                        src={talent.picture_url} 
                        alt={talent.artist_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-24 h-24 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h1 className="text-3xl font-bold">{talent.artist_name}</h1>
                    {talent.is_pro_subscriber && (
                      <ProBadge size="default" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Music className="w-4 h-4" />
                      <Badge variant="outline" className="text-sm font-bold bg-primary/10 border-primary/30 text-primary">
                        {formatTalentAct(talent.act)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{talent.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span>{talent.nationality}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span className="capitalize">{talent.gender}, {talent.age}</span>
                    </div>
                  </div>

                  {/* Rate */}
                  <div className="mb-6">
                    <div className="text-2xl font-bold text-primary">
                      {talent.rate_per_hour} {talent.currency}
                      <span className="text-base font-normal text-muted-foreground ml-2">per hour</span>
                    </div>
                  </div>

                  {/* Book Now Button */}
                  {!isOwnProfile && (
                    <Button 
                      ref={bookButtonRef}
                      onClick={handleBookNow} 
                      size="lg" 
                      className="w-full md:w-auto"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {user ? 'Book Now' : 'Sign In to Book'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Music Genres */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Music Genres</h2>
              <div className="flex flex-wrap gap-2">
                {talent.music_genres.map((genre, index) => (
                  <Badge key={index} variant="outline" className="capitalize">
                    {genre.replace(/[_-]/g, ' ')}
                  </Badge>
                ))}
                {talent.custom_genre && (
                  <Badge variant="outline" className="capitalize">
                    {talent.custom_genre}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Biography */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {talent.biography}
              </p>
            </CardContent>
          </Card>

          {/* Media Section */}
          {(talent.soundcloud_link || talent.youtube_link || talent.gallery_images.length > 0) && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-6">Media</h2>
                
                <div className="space-y-8">
                  {/* SoundCloud */}
                  {talent.soundcloud_link && (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Audio</h3>
                      <SoundCloudEmbed url={talent.soundcloud_link} />
                    </div>
                  )}

                  {/* YouTube */}
                  {talent.youtube_link && (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Video</h3>
                      <YouTubePlayer url={talent.youtube_link} />
                    </div>
                  )}

                  {/* Gallery */}
                  {talent.gallery_images.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Gallery</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {talent.gallery_images.map((image, index) => (
                          <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                            <img 
                              src={image} 
                              alt={`${talent.artist_name} gallery ${index + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Booking Form Modal */}
      {showBookingForm && user && talent && (
        <BookingForm
          talentId={talent.id}
          talentName={talent.artist_name}
          onClose={() => setShowBookingForm(false)}
          onSuccess={() => {
            setShowBookingForm(false);
            toast({
              title: "Booking Request Sent!",
              description: "Your booking request has been sent successfully.",
            });
          }}
        />
      )}

      <Footer />
    </div>
  );
}