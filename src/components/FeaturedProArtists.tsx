import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, MapPin, Music } from "lucide-react";
import { ProBadge } from "./ProBadge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface FeaturedTalent {
  id: string;
  artist_name: string;
  act: string;
  location?: string;
  picture_url?: string;
  music_genres: string[];
  rate_per_hour?: number;
  currency: string;
  is_pro_subscriber: boolean;
}

export function FeaturedProArtists() {
  const [featuredTalents, setFeaturedTalents] = useState<FeaturedTalent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedTalents();
  }, []);

  const fetchFeaturedTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select(`
          id, artist_name, act, location, picture_url, music_genres, 
          rate_per_hour, currency, is_pro_subscriber
        `)
        .eq('is_pro_subscriber', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error fetching featured talents:', error);
        return;
      }

      setFeaturedTalents(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'AED': 'د.إ'
    };
    return symbols[currency] || currency;
  };

  if (loading) {
    return (
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-headline mb-4">Featured Pro Artists</h2>
            <p className="text-subhead">Loading premium talents...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <Card className="h-64 bg-muted rounded-lg"></Card>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuredTalents.length === 0) {
    return null; // Don't show section if no Pro artists
  }

  return (
    <section className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-brand-warning" />
            <h2 className="text-headline">Featured Pro Artists</h2>
          </div>
          <p className="text-subhead max-w-2xl mx-auto">
            Discover our premium talent with verified profiles, unlimited booking requests, and zero platform commission
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredTalents.map((talent) => (
            <Card 
              key={talent.id} 
              className="overflow-hidden glass-card hover:shadow-elevated transition-all duration-300 hover:scale-105 group cursor-pointer relative"
              onClick={() => navigate(`/talent/${talent.id}`)}
            >
              {/* Pro Badge */}
              <div className="absolute top-3 right-3 z-10">
                <ProBadge size="sm" />
              </div>

              <div className="aspect-square overflow-hidden">
                <img 
                  src={talent.picture_url || "/placeholder.svg"} 
                  alt={talent.artist_name}
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              
              <CardContent className="p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{talent.artist_name}</h3>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-2">
                    <Music className="h-3 w-3" />
                    <span>{talent.act.charAt(0).toUpperCase() + talent.act.slice(1)}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{talent.location || 'Location not specified'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {talent.music_genres.slice(0, 2).map((genre) => (
                    <span 
                      key={genre} 
                      className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground"
                    >
                      {genre}
                    </span>
                  ))}
                  {talent.music_genres.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{talent.music_genres.length - 2} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
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
                        Contact for rates
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-brand-success">
                    <Crown className="h-3 w-3" />
                    <span>0% Commission</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/talent/${talent.id}`);
                  }}
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button 
            onClick={() => navigate("/")}
            className="hero-button"
          >
            <Crown className="h-4 w-4 mr-2" />
            Become a Pro Artist
          </Button>
        </div>
      </div>
    </section>
  );
}