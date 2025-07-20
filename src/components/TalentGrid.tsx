import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Music, Mic, Camera, Brush, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  nationality: string;
  created_at: string;
}

export function TalentGrid() {
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTalents();
    
    // Set up real-time subscription for new talents
    const subscription = supabase
      .channel('talent_profiles_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'talent_profiles' 
      }, () => {
        fetchTalents(); // Refresh the list when new talent is added
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching talents:', error);
        return;
      }

      setTalents(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActIcon = (act: string) => {
    switch (act.toLowerCase()) {
      case 'dj':
        return <Music className="h-4 w-4" />;
      case 'singer':
        return <Mic className="h-4 w-4" />;
      case 'band':
        return <Music className="h-4 w-4" />;
      case 'saxophonist':
      case 'keyboardist':
      case 'drummer':
      case 'percussionist':
        return <Music className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const formatAct = (act: string) => {
    return act.charAt(0).toUpperCase() + act.slice(1);
  };

  if (loading) {
    return (
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mx-auto mb-4"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24" id="talents">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Featured Talents</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover amazing performers and creators ready to make your event unforgettable
          </p>
        </div>

        {talents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No talents available yet. Be the first to join our community!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {talents.map((talent) => (
              <TalentCard key={talent.id} talent={talent} />
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Button className="hero-button">
            View All Talents
          </Button>
        </div>
      </div>
    </section>
  );
}

interface TalentCardProps {
  talent: TalentProfile;
}

function TalentCard({ talent }: TalentCardProps) {
  const getActIcon = (act: string) => {
    switch (act.toLowerCase()) {
      case 'dj':
        return <Music className="h-4 w-4" />;
      case 'singer':
        return <Mic className="h-4 w-4" />;
      case 'band':
        return <Music className="h-4 w-4" />;
      case 'saxophonist':
      case 'keyboardist':
      case 'drummer':
      case 'percussionist':
        return <Music className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const formatAct = (act: string) => {
    return act.charAt(0).toUpperCase() + act.slice(1);
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

  return (
    <Card 
      className="overflow-hidden glass-card hover:shadow-elevated transition-all duration-300 hover:scale-105 group cursor-pointer"
      onClick={() => window.location.href = `/talent/${talent.id}`}
    >
      <div className="relative">
        <img 
          src={talent.picture_url || "/placeholder.svg"} 
          alt={talent.artist_name}
          className="w-full h-48 object-cover object-center group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex items-center space-x-1 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
          {getActIcon(talent.act)}
          <span className="text-xs text-white">{formatAct(talent.act)}</span>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg">{talent.artist_name}</h3>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{talent.location || 'Location not specified'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {talent.music_genres && talent.music_genres.length > 0 && talent.music_genres.map((genre) => (
            <Badge key={genre} variant="secondary" className="text-xs">
              {genre}
            </Badge>
          ))}
          {talent.custom_genre && (
            <Badge variant="secondary" className="text-xs">
              {talent.custom_genre}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">New</span>
          </div>
          <div className="text-right">
            {talent.rate_per_hour ? (
              <>
                <div className="text-lg font-bold text-brand-primary">
                  {getCurrencySymbol(talent.currency)}{talent.rate_per_hour}
                </div>
                <div className="text-xs text-muted-foreground">per hour</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Rate not set
              </div>
            )}
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/talent/${talent.id}`;
          }}
        >
          View Profile
        </Button>
      </div>
    </Card>
  );
}