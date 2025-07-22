import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Search, Music, Crown, HelpCircle } from "lucide-react";
import { countries } from "@/lib/countries";
import { supabase } from "@/integrations/supabase/client";
import { BookingForm } from "@/components/BookingForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  is_pro_subscriber?: boolean;
}

export function HeroSection() {
  const navigate = useNavigate();
  const [searchFilters, setSearchFilters] = useState({
    location: '',
    talentType: 'all'
  });
  const [featuredTalents, setFeaturedTalents] = useState<TalentProfile[]>([]);
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  useEffect(() => {
    fetchFeaturedTalents();
  }, []);

  const fetchFeaturedTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('id, artist_name, act, location, picture_url, is_pro_subscriber')
        .eq('is_pro_subscriber', true)
        .limit(2)
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
    window.location.href = newUrl;
    
    // Ensure scroll to talents section after navigation
    setTimeout(() => {
      document.getElementById('talents')?.scrollIntoView({ 
        behavior: 'smooth' 
      });
    }, 100);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-brand-primary/5" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fadeIn">
            <div className="space-y-4">
              <div className="text-brand-accent font-semibold text-lg">
                1000s of successful bookings
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Find <span className="gradient-text">Amazing Talent</span> for your event
              </h1>
              
               <p className="text-xl text-muted-foreground max-w-lg">
                 NAGHM is the easiest way to book great artists, musicians, performers and creators for your event. Start by telling us about your event.
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

            {/* Reviews */}
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
          </div>

          {/* Right Content - Featured Talents Carousel */}
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Featured Pro Artists</h3>
              <p className="text-sm text-muted-foreground">Premium talents ready to elevate your event</p>
            </div>
            
            <div className="space-y-4">
              {featuredTalents.length > 0 ? (
                featuredTalents.map((talent, index) => (
                  <div
                    key={talent.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <FeaturedTalentCard 
                      id={talent.id}
                      name={talent.artist_name}
                      location={talent.location || 'Location not specified'}
                      category={talent.act.charAt(0).toUpperCase() + talent.act.slice(1)}
                      image={talent.picture_url || "/placeholder.svg"}
                      isPro={talent.is_pro_subscriber || false}
                    />
                  </div>
                ))
              ) : (
                // Fallback loading state
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <Card className="p-4 glass-card h-24 bg-muted/50"></Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Booker Help Section */}
        <div className="mt-16 text-center space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              <HelpCircle className="h-8 w-8 text-brand-primary mr-3" />
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
                Can't find what you're looking for?
              </h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Let us help you find the perfect talent for your event. Our team will personally match you with artists that fit your specific needs and budget.
            </p>
          </div>
          
          <Button 
            size="lg"
            className="hero-button px-8 py-6 text-lg"
            onClick={() => setShowBookingDialog(true)}
          >
            Tell us about your event
          </Button>
          
          <div className="text-sm text-muted-foreground">
            📝 Submit your request and our pro talents will reach out to you
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] overflow-hidden p-0">
          <div className="max-h-[95vh] overflow-y-auto p-6">
          <BookingForm
            talentId="public-request"
            talentName="Personal Assistance Request"
            onClose={() => setShowBookingDialog(false)}
            onSuccess={() => {
              setShowBookingDialog(false);
            }}
          />
            </div>
        </DialogContent>
      </Dialog>
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
}

function FeaturedTalentCard({ id, name, location, category, image, isPro }: FeaturedTalentCardProps) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (id) {
      navigate(`/talent/${id}`);
    }
  };

  return (
    <Card 
      className="group p-4 glass-card hover:shadow-elevated transition-all duration-500 hover:scale-[1.02] cursor-pointer overflow-hidden border border-border/50 hover:border-primary/30 relative"
      onClick={handleClick}
    >
      <div className="flex items-center space-x-4">
        {/* Profile Picture with Pro Badge */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
            <img 
              src={image} 
              alt={name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>
          
          {/* Pro Badge - Smaller and positioned outside the image */}
          {isPro && (
            <div className="absolute -top-1 -right-1 z-10">
              <div className="pro-badge text-[10px] px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-0.5 animate-scale-in">
                <Crown className="h-2.5 w-2.5" />
                <span className="font-bold">PRO</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Artist Info */}
        <div className="flex-1 min-w-0">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300 truncate">
              {name}
            </h3>
            <p className="text-muted-foreground text-sm font-medium">
              {category}
            </p>
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{location}</span>
            </div>
          </div>
        </div>
        
        {/* Rating & Status */}
        <div className="flex flex-col items-end space-y-2">
          <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">4.9</span>
          </div>
          
          <div className="text-xs text-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1 animate-pulse"></div>
            <span className="text-muted-foreground">Available</span>
          </div>
        </div>
      </div>
      
      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </Card>
  );
}