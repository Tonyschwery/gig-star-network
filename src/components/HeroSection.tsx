import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Star, MapPin, Search, Music, Crown, HelpCircle } from "lucide-react";
import { countries } from "@/lib/countries";
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
  const [searchFilters, setSearchFilters] = useState({
    location: '',
    talentType: 'all'
  });
  const [featuredTalents, setFeaturedTalents] = useState<TalentProfile[]>([]);

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
    // Create URL parameters for search
    const params = new URLSearchParams();
    if (searchFilters.location && searchFilters.location !== 'all') {
      params.set('location', searchFilters.location);
    }
    if (searchFilters.talentType && searchFilters.talentType !== 'all') {
      params.set('type', searchFilters.talentType);
    }

    // Build the URL with search parameters
    const newUrl = params.toString() ? `/?${params.toString()}#talents` : '/#talents';
    
    console.log('Search filters:', searchFilters);
    console.log('Generated URL:', newUrl);
    
    // Navigate to the new URL and scroll to talents section
    navigate(newUrl);
    
    // Show search feedback
    const hasFilters = searchFilters.location !== 'all' || searchFilters.talentType !== 'all';
    if (hasFilters) {
      // Small delay to allow navigation to complete
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
      {/* Background Gradient */}
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
                Book <span className="text-accent">live talent</span> for your event
              </h1>
              
               <p className="text-subhead max-w-lg">
                 Qtalent.live is the simplest way to find and book exceptional performers, artists, and creators for any occasion.
               </p>
            </div>

            {/* Search Form */}
            <Card className="p-6 glass-card">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">TALENT LOCATION</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Select 
                      value={searchFilters.location} 
                      onValueChange={(value) => setSearchFilters(prev => ({ ...prev, location: value }))}
                    >
                      <SelectTrigger className="pl-10 bg-input border-border">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="all">All Countries</SelectItem>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">TALENT TYPE</label>
                  <div className="relative">
                    <Music className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Select 
                      value={searchFilters.talentType} 
                      onValueChange={(value) => setSearchFilters(prev => ({ ...prev, talentType: value }))}
                    >
                      <SelectTrigger className="pl-10 bg-input border-border">
                        <SelectValue placeholder="Select talent type" />
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
                    className="w-full hero-button"
                    onClick={handleSearch}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Find Talent
                  </Button>
                </div>
              </div>
            </Card>

            {/* Search Results Info */}
            <div className="flex items-center space-x-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                Excellent - <strong>4320</strong> five-star reviews by organizers
              </span>
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
              <p className="text-sm text-muted-foreground">Premium talents with verified profiles & zero commission</p>
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
                  }),
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
                        category={talent.act.charAt(0).toUpperCase() + talent.act.slice(1)}
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
        <div className="mt-16 text-center space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              <HelpCircle className="h-8 w-8 text-accent mr-3" />
              <h2 className="text-headline">
                Can't find what you're looking for?
              </h2>
            </div>
            <p className="text-subhead max-w-2xl mx-auto">
              Let us help you find the perfect talent for your event. Our team will personally reach out with curated recommendations that fit your specific needs and budget.
            </p>
          </div>
          
          <Button 
            size="lg"
            className="hero-button px-8 py-6 text-lg"
            onClick={() => navigate('/your-event')}
          >
            {user ? "Tell us about your event" : "Sign up & tell us about your event"}
          </Button>
          
          <div className="text-sm text-muted-foreground">
            📝 {user 
              ? "Submit your request and our team will reach out with personalized recommendations" 
              : "Create an account to submit your event request - it only takes a minute!"
            }
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
          <p className="text-muted-foreground text-sm font-medium">
            {category}
          </p>
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