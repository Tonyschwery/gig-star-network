import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Music, Mic, Camera, Brush, User, Filter, X, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  gender?: string; // Optional since public view might not include it
  age: string;
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
  is_pro_subscriber?: boolean;
  subscription_started_at?: string;
}

export function TalentGrid() {
  const [searchParams] = useSearchParams();
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [filteredTalents, setFilteredTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState({
    location: searchParams.get('location') || '',
    date: searchParams.get('date') || '',
    type: searchParams.get('type') || ''
  });

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

  // Update filters when URL parameters change
  useEffect(() => {
    setActiveFilters({
      location: searchParams.get('location') || '',
      date: searchParams.get('date') || '',
      type: searchParams.get('type') || ''
    });
  }, [searchParams]);

  // Apply filters whenever talents or filters change
  useEffect(() => {
    applyFilters();
  }, [talents, activeFilters]);

  const fetchTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles_public')
        .select('*')
        .order('is_pro_subscriber', { ascending: false }) // Pro users first
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

  const applyFilters = () => {
    let filtered = [...talents];

    // Filter by location (country)
    if (activeFilters.location && activeFilters.location !== 'all') {
      const locationQuery = activeFilters.location.toLowerCase();
      filtered = filtered.filter(talent => {
        const talentLocation = talent.location?.toLowerCase() || '';
        const talentNationality = talent.nationality?.toLowerCase() || '';
        return talentLocation.includes(locationQuery) || 
               talentNationality.includes(locationQuery) ||
               talentLocation === locationQuery ||
               talentNationality === locationQuery;
      });
    }

    // Filter by talent type
    if (activeFilters.type && activeFilters.type !== 'all') {
      filtered = filtered.filter(talent => 
        talent.act.toLowerCase() === activeFilters.type.toLowerCase()
      );
    }

    // Date filtering placeholder - can be enhanced with booking system
    if (activeFilters.date) {
      // For now, we show all talents regardless of date
      // This can be enhanced when booking system is implemented
      console.log('Filtering by date:', activeFilters.date);
    }

    setFilteredTalents(filtered);
  };

  const clearFilters = () => {
    window.history.pushState({}, '', window.location.pathname);
    setActiveFilters({ location: '', date: '', type: '' });
  };

  const hasActiveFilters = (activeFilters.location && activeFilters.location !== 'all') || 
                          activeFilters.date || 
                          (activeFilters.type && activeFilters.type !== 'all');
  const talentsToShow = hasActiveFilters ? filteredTalents : talents;

  if (loading) {
    return (
      <section id="talents" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Loading Amazing Talent...</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-lg h-64"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="talents" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            {hasActiveFilters ? 'Search Results' : 'Amazing Talent Ready to Perform'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {hasActiveFilters 
              ? `Found ${talentsToShow.length} talent${talentsToShow.length !== 1 ? 's' : ''} matching your criteria`
              : 'Browse through our curated selection of professional performers'
            }
          </p>
          
          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Active filters:</span>
              </div>
              
              {activeFilters.location && activeFilters.location !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Location: {activeFilters.location}
                </Badge>
              )}
              
              {activeFilters.date && (
                <Badge variant="secondary" className="gap-1">
                  Date: {new Date(activeFilters.date).toLocaleDateString()}
                </Badge>
              )}
              
              {activeFilters.type && activeFilters.type !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Type: {activeFilters.type.charAt(0).toUpperCase() + activeFilters.type.slice(1)}
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </div>
          )}
        </div>

        {talentsToShow.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Music className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {hasActiveFilters ? 'No talents found' : 'No talents available yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters 
                ? 'Try adjusting your search criteria to find more talents'
                : 'Check back soon for amazing performers!'
              }
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline">
                View All Talents
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {talentsToShow.map((talent) => (
              <TalentCard key={talent.id} talent={talent} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface TalentCardProps {
  talent: TalentProfile;
}

function TalentCard({ talent }: TalentCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const handleProfileClick = () => {
    navigate(`/talent/${talent.id}`);
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
      onClick={handleProfileClick}
    >
      <div className="relative">
        <div className="aspect-square overflow-hidden">
          <img 
            src={talent.picture_url || "/placeholder.svg"} 
            alt={talent.artist_name}
            className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
          />
        </div>
        <div className="absolute top-3 left-3 flex items-center space-x-1 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
          {getActIcon(talent.act)}
          <span className="text-xs text-white">{formatAct(talent.act)}</span>
        </div>
        {talent.is_pro_subscriber && (
          <div className="absolute top-3 right-3">
            <Badge className="pro-badge">
              <Crown className="h-3 w-3 mr-1" />
              PRO
            </Badge>
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{talent.artist_name}</h3>
            {talent.is_pro_subscriber && (
              <Badge className="pro-badge text-xs">
                <Crown className="h-3 w-3 mr-1" />
                PRO
              </Badge>
            )}
          </div>
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
            handleProfileClick();
          }}
        >
          View Profile
        </Button>
      </div>
    </Card>
  );
}