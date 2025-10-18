import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Star, MapPin, Search, Music, Crown, HelpCircle, Calendar } from "lucide-react";
import { countries, sortCountriesByProximity } from "@/lib/countries";
import { useLocationDetection } from "@/hooks/useLocationDetection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ProBadge } from "@/components/ProBadge";
import Autoplay from "embla-carousel-autoplay";

const talentTypes = [
  { value: 'all', label: 'All Talent Types' },
  { value: 'dj', label: 'DJ' },
  { value: 'singer', label: 'Singer' },
  { value: 'band', label: 'Band' },
  { value: 'saxophonist', label: 'Saxophonist' },
  { value: 'keyboardist', label: 'Keyboardist' },
  { value: 'drummer', label: 'Drummer' },
  { value: 'percussionist', label: 'Percussionist' },
  { value: 'guitarist', label: 'Guitarist' },
  { value: 'violinist', label: 'Violinist' },
  { value: 'magician', label: 'Magician' },
  { value: 'gogo_dancer', label: 'Gogo Dancer' },
  { value: 'belly_dancer', label: 'Belly Dancer' },
  { value: 'other', label: 'Other' }
];

interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  location?: string;
  picture_url?: string;
  is_pro_subscriber: boolean;
  rate_per_hour?: number;
  currency: string;
  music_genres: string[];
}

export function HeroSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { detectedLocation, userLocation } = useLocationDetection();
  const [searchFilters, setSearchFilters] = useState({
    location: '',
    talentType: 'all'
  });
  const [featuredTalents, setFeaturedTalents] = useState<TalentProfile[]>([]);
  
  // Sort countries by proximity to user's location
  const sortedCountries = sortCountriesByProximity(detectedLocation || userLocation, countries);

  useEffect(() => {
    fetchFeaturedTalents();
  }, []);

  const fetchFeaturedTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select(`
          id, artist_name, act, location, picture_url, is_pro_subscriber,
          rate_per_hour, currency, music_genres
        `)
        .eq('is_pro_subscriber', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching featured talents:', error);
        return;
      }

      setFeaturedTalents(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchFilters.location && searchFilters.location !== 'all') {
      params.set('location', searchFilters.location);
    }
    if (searchFilters.talentType && searchFilters.talentType !== 'all') {
      params.set('type', searchFilters.talentType);
    }

    const newUrl = params.toString() ? `/?${params.toString()}#talents` : '/#talents';
    
    navigate(newUrl);
    
    const hasFilters = searchFilters.location !== 'all' || searchFilters.talentType !== 'all';
    if (hasFilters) {
      setTimeout(() => {
        document.getElementById('talents')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-brand-primary/5" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fadeIn">
            <div className="space-y-6">
              <div className="text-accent font-medium text-lg">
                Connect with live talent
              </div>
              
              <h1 className="text-display">
                Book <span className="text-accent">live talents</span> for your event
              </h1>
              
               <p className="text-subhead max-w-lg">
                 Qtalent.live is the simplest way to find and book exceptional performers, artists, and creators for any occasion.
               </p>
            </div>

            {/* Search Form */}
            <Card className="p-8 glass-card border border-border/50 shadow-elevated">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground uppercase tracking-wide">WHERE</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 h-5 w-5 text-muted-foreground z-10" />
                    <Select 
                      value={searchFilters.location} 
                      onValueChange={(value) => setSearchFilters(prev => ({ ...prev, location: value }))}
                    >
                      <SelectTrigger className="pl-12 h-12 bg-background/50 border-border/50 hover:border-accent/50 transition-colors">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="all">All Countries</SelectItem>
                        {sortedCountries.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            {country.flag} {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground uppercase tracking-wide">TALENT TYPE</label>
                  <div className="relative">
                    <Music className="absolute left-4 top-4 h-5 w-5 text-muted-foreground z-10" />
                    <Select 
                      value={searchFilters.talentType} 
                      onValueChange={(value) => setSearchFilters(prev => ({ ...prev, talentType: value }))}
                    >
                      <SelectTrigger className="pl-12 h-12 bg-background/50 border-border/50 hover:border-accent/50 transition-colors">
                        <SelectValue placeholder="What kind of talent?" />
                      </SelectTrigger>
                      <SelectContent>
                        {talentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    className="w-full h-12 bg-primary text-primary-foreground font-bold text-sm sm:text-base shadow-minimal hover:shadow-elevated transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90 rounded-xl"
                    onClick={handleSearch}
                  >
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                    <span className="truncate">Explore</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Social Proof */}
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">4.9/5</strong> from 2,340+ bookings
                </span>
              </div>
              <div className="h-4 w-px bg-border"></div>
              <div className="text-muted-foreground">
                <strong className="text-foreground">500+</strong> professional artists
              </div>
            </div>
            
            {/* Search Status Message */}
            {(searchFilters.location !== 'all' && searchFilters.location) || 
             (searchFilters.talentType !== 'all' && searchFilters.talentType) ? (
              <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                <div className="text-sm text-accent font-medium">
                  🎯 Your search will show results below in the talent section
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Looking for{' '}
                  {searchFilters.talentType !== 'all' && searchFilters.talentType ? (
                    <span className="font-medium">{searchFilters.talentType}s</span>
                  ) : (
                    <span className="font-medium">all talent types</span>
                  )}
                  {searchFilters.location !== 'all' && searchFilters.location && (
                    <span> in <span className="font-medium">{searchFilters.location}</span></span>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Content - Pro Artists Carousel */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Crown className="h-6 w-6 text-brand-warning" />
                <h3 className="text-xl font-bold text-foreground">Featured Pro Artists</h3>
              </div>
              <p className="text-sm text-muted-foreground">Premium verified talents with unlimited bookings</p>
            </div>
            
            {featuredTalents.length > 0 ? (
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                plugins={[
                  Autoplay({
                    delay: 3000,
                    stopOnInteraction: true,
                  }) as any,
                ]}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {featuredTalents.map((talent) => (
                    <CarouselItem key={talent.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/2">
                      <FeaturedTalentCard 
                        id={talent.id}
                        name={talent.artist_name}
                        location={talent.location || 'Location not specified'}
                        category={talent.act.toLowerCase() === 'dj' ? 'DJ' : talent.act.charAt(0).toUpperCase() + talent.act.slice(1)}
                        image={talent.picture_url || "/placeholder.svg"}
                        isPro={talent.is_pro_subscriber}
                        rate={talent.rate_per_hour}
                        currency={talent.currency}
                        genres={talent.music_genres}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>
            ) : (
              // Loading state
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <Card className="p-4 glass-card h-32 bg-muted/50"></Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Booker Help Section */}
        <div className="mt-24 text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center p-3 bg-accent/10 rounded-full mb-4">
              <HelpCircle className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Need help finding the perfect talents?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Our expert team personally curates recommendations based on your event type, budget, and style preferences. Get matched with verified performers in 24 hours.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              className="hero-button px-8 py-4 text-base font-semibold"
              onClick={() => {
                if (user) {
                  navigate('/your-event');
                } else {
                  navigate('/auth', { state: { intent: 'event-form', mode: 'booker' } });
                }
              }}
            >
              {user ? "Get Personalized Recommendations" : "Start Free Consultation"}
            </Button>
            
            {!user && (
              <div className="text-sm text-muted-foreground">
                No account needed • Free consultation • 2 min setup
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-2 bg-accent/10 rounded-full">
                <Search className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold">Tell us your needs</h3>
              <p className="text-sm text-muted-foreground">Share your event details and preferences with us</p>
            </div>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-2 bg-accent/10 rounded-full">
                <Star className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold">Get matched</h3>
              <p className="text-sm text-muted-foreground">Receive curated talent recommendations within 24h</p>
            </div>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-2 bg-accent/10 rounded-full">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold">Book & celebrate</h3>
              <p className="text-sm text-muted-foreground">Connect directly and create unforgettable experiences</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface FeaturedTalentCardProps {
  id?: string;
  name: string;
  location: string;
  category: string;
  image: string;
  isPro: boolean;
  rate?: number;
  currency: string;
  genres: string[];
}

function FeaturedTalentCard({ id, name, location, category, image, isPro, rate, currency, genres }: FeaturedTalentCardProps) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (id) {
      navigate(`/talent/${id}`);
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

  return (
    <Card 
      className="group p-4 glass-card hover:shadow-elevated transition-all duration-500 hover:scale-[1.02] cursor-pointer overflow-hidden border border-border/50 hover:border-primary/30 relative h-full"
      onClick={handleClick}
    >
      {/* Pro Badge - Top Right */}
      {isPro && (
        <div className="absolute top-3 right-3 z-10">
          <ProBadge size="sm" />
        </div>
      )}

      {/* Profile Picture */}
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
      </div>
      
      {/* Artist Info */}
      <div className="text-center space-y-2">
        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors duration-300 truncate">
          {name}
        </h3>
        <div className="space-y-1">
          <div className="flex justify-center">
            <Badge variant="outline" className="text-xs font-bold bg-primary/10 border-primary/30 text-primary">
              {category}
            </Badge>
          </div>
          <div className="flex items-center justify-center space-x-1">
            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{location}</span>
          </div>
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-1 justify-center">
          {genres?.slice(0, 2).map((genre) => (
            <span 
              key={genre} 
              className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground"
            >
              {genre}
            </span>
          ))}
          {genres?.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{genres.length - 2} more
            </span>
          )}
        </div>

        {/* Rate & Status */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">Pro</span>
          </div>
          
          <div className="text-right">
            {rate ? (
              <>
                <div className="text-sm font-bold text-brand-primary">
                  {getCurrencySymbol(currency)}{rate}
                </div>
                <div className="text-xs text-muted-foreground">per hour</div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">
                Contact for rates
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </Card>
  );
}