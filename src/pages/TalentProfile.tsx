import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Music, 
  Mic, 
  User, 
  Star, 
  Calendar,
  MessageCircle,
  ArrowLeft,
  ExternalLink,
  Play
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  gender: string;
  age: number;
  location?: string;
  rate_per_hour?: number;
  currency: string;
  music_genres: string[];
  custom_genre?: string;
  picture_url?: string;
  soundcloud_link?: string;
  youtube_link?: string;
  biography: string;
  country_of_residence: string;
  created_at: string;
}

export default function TalentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [talent, setTalent] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTalent(id);
    }
  }, [id]);

  const fetchTalent = async (talentId: string) => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('*')
        .eq('id', talentId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching talent:', error);
        toast({
          title: "Error",
          description: "Failed to load talent profile",
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        toast({
          title: "Not Found",
          description: "Talent profile not found",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setTalent(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load talent profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActIcon = (act: string) => {
    switch (act.toLowerCase()) {
      case 'dj':
        return <Music className="h-5 w-5" />;
      case 'singer':
        return <Mic className="h-5 w-5" />;
      case 'band':
        return <Music className="h-5 w-5" />;
      case 'saxophonist':
      case 'keyboardist':
      case 'drummer':
      case 'percussionist':
        return <Music className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'AED': 'د.إ',
      'SAR': 'ر.س',
      'QAR': 'ر.ق',
      'KWD': 'د.ك',
      'BHD': '.د.ب',
      'OMR': 'ر.ع.',
      'JOD': 'د.ا',
      'LBP': 'ل.ل',
      'EGP': 'ج.م'
    };
    return symbols[currency] || currency;
  };

  const handleBookNow = () => {
    toast({
      title: "Booking Request",
      description: "Booking functionality will be implemented soon!",
    });
  };

  const handleChatWithTalent = () => {
    toast({
      title: "Chat Feature",
      description: "Chat functionality will be implemented soon!",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="h-64 bg-muted rounded mb-6"></div>
                  <div className="h-32 bg-muted rounded"></div>
                </div>
                <div className="h-96 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Talent Not Found</h1>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Talents
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hero Section */}
              <Card className="overflow-hidden">
                <div className="relative h-64 bg-gradient-to-br from-brand-primary/20 to-brand-accent/20">
                  {talent.picture_url && (
                    <img 
                      src={talent.picture_url} 
                      alt={talent.artist_name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/30"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="flex items-center space-x-2 mb-2">
                      {getActIcon(talent.act)}
                      <span className="text-sm font-medium">
                        {talent.act.charAt(0).toUpperCase() + talent.act.slice(1)}
                      </span>
                    </div>
                    <h1 className="text-3xl font-bold">{talent.artist_name}</h1>
                    <div className="flex items-center space-x-1 text-sm opacity-90">
                      <MapPin className="h-3 w-3" />
                      <span>{talent.location || 'Location not specified'}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Biography */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">About {talent.artist_name}</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {talent.biography}
                </p>
              </Card>

              {/* Media Section */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Media & Links</h2>
                <div className="space-y-4">
                  {talent.soundcloud_link && (
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                          <Play className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium">SoundCloud</h3>
                          <p className="text-sm text-muted-foreground">Listen to tracks</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(talent.soundcloud_link, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Listen
                      </Button>
                    </div>
                  )}
                  
                  {talent.youtube_link && (
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                          <Play className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium">YouTube</h3>
                          <p className="text-sm text-muted-foreground">Watch videos</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(talent.youtube_link, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Watch
                      </Button>
                    </div>
                  )}

                  {!talent.soundcloud_link && !talent.youtube_link && (
                    <p className="text-muted-foreground text-center py-8">
                      No media links available yet
                    </p>
                  )}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Booking Card */}
              <Card className="p-6">
                <div className="text-center mb-6">
                  {talent.rate_per_hour ? (
                    <>
                      <div className="text-3xl font-bold text-brand-primary">
                        {getCurrencySymbol(talent.currency)}{talent.rate_per_hour}
                      </div>
                      <div className="text-sm text-muted-foreground">per hour</div>
                    </>
                  ) : (
                    <div className="text-lg text-muted-foreground">
                      Rate available on request
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Button 
                    className="w-full hero-button"
                    onClick={handleBookNow}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Now
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleChatWithTalent}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with Talent
                  </Button>
                </div>
              </Card>

              {/* Talent Details */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Talent Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age:</span>
                    <span>{talent.age} years old</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender:</span>
                    <span>{talent.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Country:</span>
                    <span>{talent.country_of_residence}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">New Talent</span>
                  </div>
                </div>
              </Card>

              {/* Genres */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Music Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {talent.music_genres && talent.music_genres.length > 0 && talent.music_genres.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                  {talent.custom_genre && (
                    <Badge variant="secondary">
                      {talent.custom_genre}
                    </Badge>
                  )}
                  {(!talent.music_genres || talent.music_genres.length === 0) && !talent.custom_genre && (
                    <p className="text-sm text-muted-foreground">No genres specified</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}