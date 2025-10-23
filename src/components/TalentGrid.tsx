import { useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Music, Mic, User, Filter, X } from "lucide-react";
import { ProBadge } from "@/components/ProBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocationDetection } from "@/hooks/useLocationDetection";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeTalentProfiles } from "@/hooks/useRealtimeTalentProfiles";

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
  soundcloud_link?: string;
  youtube_link?: string;
  biography: string;
  nationality: string;
  created_at: string;
  is_pro_subscriber?: boolean;
  subscription_started_at?: string;
}

// Single optimized query function
const fetchTalents = async (): Promise<TalentProfile[]> => {
  console.log('🔄 Fetching talents...');
  
  const { data, error } = await supabase
    .from('talent_profiles')
    .select('*')
    .order('is_pro_subscriber', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching talents:', error);
    throw error;
  }

  console.log('✅ Talents fetched:', data.length);
  return data as TalentProfile[];
};

export function TalentGrid() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userLocation } = useLocationDetection();
  const queryClient = useQueryClient();

  const activeFilters = useMemo(() => ({
    location: searchParams.get('location') || '',
    date: searchParams.get('date') || '',
    type: searchParams.get('type') || ''
  }), [searchParams]);

  // React Query with caching
  const { data: talents = [], isLoading, error } = useQuery({
    queryKey: ['talents'],
    queryFn: fetchTalents,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1
  });

  // Real-time subscription with debounce
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
    const channel = supabase
      .channel('talent-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'talent_profiles' 
      }, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log('🔄 Real-time update, invalidating cache...');
          queryClient.invalidateQueries({ queryKey: ['talents'] });
        }, 500); // 500ms debounce
      })
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Memoized filtering
  const filteredTalents = useMemo(() => {
    let filtered = [...talents];

    if (activeFilters.location && activeFilters.location !== 'all') {
      const locationQuery = activeFilters.location.toLowerCase();
      filtered = filtered.filter(talent => {
        const talentLocation = talent.location?.toLowerCase() || '';
        return talentLocation.includes(locationQuery);
      });
    }

    if (activeFilters.type && activeFilters.type !== 'all') {
      filtered = filtered.filter(talent => 
        talent.act.toLowerCase() === activeFilters.type.toLowerCase()
      );
    }

    return filtered;
  }, [talents, activeFilters]);

  const clearFilters = () => {
    navigate('/');
    setTimeout(() => {
      document.getElementById('talents')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const hasActiveFilters = (activeFilters.location && activeFilters.location !== 'all') || 
                          (activeFilters.type && activeFilters.type !== 'all');
  const talentsToShow = hasActiveFilters ? filteredTalents : talents;

  if (isLoading) {
    return (
      <section id="talents" className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full mb-6">
              <div className="h-2 w-2 bg-accent rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-accent">Discovering Talents</span>
            </div>
            <h2 className="text-4xl font-bold mb-6">Loading Amazing Talent...</h2>
            <p className="text-muted-foreground text-lg">
              Finding the perfect performers for your event
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted/50 rounded-2xl h-80 backdrop-blur-sm"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="talents" className="py-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-destructive mb-4">Failed to load talents</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['talents'] })}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section id="talents" className="py-20 bg-gradient-to-b from-background to-muted/30 w-full max-w-full overflow-x-hidden">
      <div className="container mx-auto px-4 w-full max-w-full">
        <div className="text-center mb-16 w-full max-w-full">
          <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full mb-6">
            <div className="h-2 w-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-accent">
              {hasActiveFilters ? 'Search Results' : 'Featured Talents'}
            </span>
          </div>
          <h2 className="text-4xl font-bold mb-6">
            {userLocation && userLocation !== 'Worldwide' ? `Discover Talents in ${userLocation}` : 'Discover Exceptional Talents'}
          </h2>
          {userLocation && userLocation !== 'Worldwide' && (
            <p className="text-center text-muted-foreground mb-4">
              📍 Showing local talent first • <span className="text-xs">Change location in header</span>
            </p>
          )}
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {hasActiveFilters 
              ? 'Talented performers ready to make your event unforgettable'
              : `${talentsToShow.length} verified performers ready to bring your event to life`
            }
          </p>
        </div>
          
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

        {talentsToShow.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <Music className="h-16 w-16 text-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-4">No talents found</h3>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              {hasActiveFilters 
                ? 'Try adjusting your search criteria to discover more amazing performers'
                : 'No talent profiles are available at the moment'
              }
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} className="hero-button">
                Clear Filters & Browse All
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {talentsToShow.map((talent, index) => (
              <div 
                key={talent.id} 
                className="animate-fadeIn w-full max-w-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <TalentCard talent={talent} />
              </div>
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
      case 'band':
      case 'saxophonist':
      case 'keyboardist':
      case 'drummer':
      case 'percussionist':
        return <Music className="h-4 w-4" />;
      case 'singer':
        return <Mic className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  // Format talent act display
  const formatAct = (act: string) => {
    if (act.toLowerCase() === 'dj') return 'DJ';
    return act.charAt(0).toUpperCase() + act.slice(1);
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'AED': 'د.إ', 'SAR': 'ر.س',
      'QAR': 'ر.ق', 'KWD': 'د.ك', 'BHD': '.د.ب', 'OMR': 'ر.ع.',
      'JOD': 'د.ا', 'LBP': 'ل.ل', 'EGP': 'ج.م'
    };
    return symbols[currency] || currency;
  };

  return (
    <Card 
      className="group overflow-hidden bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-[1.02] hover:border-accent/30 cursor-pointer"
      onClick={handleProfileClick}
    >
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted/50 to-muted">
          <img 
            src={talent.picture_url || "/placeholder.svg"} 
            alt={talent.artist_name}
            className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
        
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 text-white">
          {getActIcon(talent.act)}
          <Badge variant="outline" className="text-xs font-bold bg-primary/10 border-primary/30 text-primary">
            {formatAct(talent.act)}
          </Badge>
        </div>
        
        {talent.is_pro_subscriber && (
          <div className="absolute top-4 right-4">
            <ProBadge size="sm" />
          </div>
        )}
        
        <div className="absolute inset-x-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <Button 
            size="sm"
            className="w-full bg-white/90 hover:bg-white text-black font-medium backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleProfileClick();
            }}
          >
            View Profile
          </Button>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        <div>
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg text-foreground group-hover:text-accent transition-colors duration-300 line-clamp-1">
              {talent.artist_name}
            </h3>
            {talent.is_pro_subscriber && (
              <ProBadge size="sm" className="ml-2 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm truncate">{talent.location || 'Location TBD'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {talent.music_genres && talent.music_genres.slice(0, 3).map((genre) => (
            <Badge key={genre} variant="secondary" className="text-xs font-medium">
              {genre}
            </Badge>
          ))}
          {talent.custom_genre && (
            <Badge variant="secondary" className="text-xs font-medium">
              {talent.custom_genre}
            </Badge>
          )}
          {talent.music_genres && talent.music_genres.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{talent.music_genres.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                {talent.is_pro_subscriber ? 'Pro' : 'New'}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            {talent.rate_per_hour ? (
              <>
                <div className="text-lg font-bold text-accent">
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
        </div>
      </div>
    </Card>
  );
}