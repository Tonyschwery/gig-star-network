import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Star, MapPin, Search, Music, Crown, HelpCircle, Calendar } from "lucide-react";
import { countries } from "@/lib/countries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ProBadge } from "@/components/ProBadge";
import Autoplay from "embla-carousel-autoplay";

// --- Helper Data and Components ---

const talentTypes = [
  { value: 'all', label: 'All Talent Types' },
  { value: 'dj', label: 'DJ' },
  { value: 'singer', label: 'Singer' },
  { value: 'band', label: 'Band' },
  { value: 'saxophonist', label: 'Saxophonist' },
  // Add other types as needed
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

// --- Main Hero Section Component ---

export function HeroSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchFilters, setSearchFilters] = useState({ location: '', talentType: 'all' });
  const [featuredTalents, setFeaturedTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedTalents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('talent_profiles')
        .select(`id, artist_name, act, location, picture_url, is_pro_subscriber, rate_per_hour, currency, music_genres`)
        .eq('is_pro_subscriber', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching featured talents:', error);
      } else {
        setFeaturedTalents(data || []);
      }
      setLoading(false);
    };
    fetchFeaturedTalents();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchFilters.location && searchFilters.location !== 'all') {
      params.set('location', searchFilters.location);
    }
    if (searchFilters.talentType && searchFilters.talentType !== 'all') {
      params.set('type', searchFilters.talentType);
    }
    navigate(`/?${params.toString()}#talents`);
    
    setTimeout(() => {
      document.getElementById('talents')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter">
                Book <span className="text-primary">Live Talent</span> for Any Event
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                The simplest way to find and book exceptional performers for any occasion.
              </p>
            </div>
            <Card className="p-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Location</p>
                  <Select value={searchFilters.location} onValueChange={(value) => setSearchFilters(prev => ({ ...prev, location: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {countries.map((c) => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Talent Type</p>
                  <Select value={searchFilters.talentType} onValueChange={(value) => setSearchFilters(prev => ({ ...prev, talentType: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select talent" /></SelectTrigger>
                    <SelectContent>
                      {talentTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full h-12" onClick={handleSearch}>
                    <Search className="h-5 w-5 mr-2" /> Explore
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Content - Carousel */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-bold">Featured Pro Artists</h3>
            </div>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full">
                <CarouselContent>
                  {featuredTalents.map((talent) => (
                    <CarouselItem key={talent.id} className="md:basis-1/2">
                      <FeaturedTalentCard talent={talent} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>
            )}
          </div>
        </div>
        
        {/* Booker Help Section */}
        <div className="mt-24 text-center space-y-6">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">Need Help Finding Talent?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Let our team curate personalized recommendations based on your event.
          </p>
          <div className="flex justify-center">
            <Button size="lg" className="px-8 py-4 text-base" onClick={() => navigate('/your-event')}>
              Get Personalized Recommendations
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Sub-component for the Featured Talent Card ---

interface FeaturedTalentCardProps {
  talent: TalentProfile;
}

function FeaturedTalentCard({ talent }: FeaturedTalentCardProps) {
  const navigate = useNavigate();
  
  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'AED': 'د.إ' };
    return symbols[currency] || currency;
  };

  return (
    <Card 
      className="group p-4 cursor-pointer overflow-hidden h-full"
      onClick={() => navigate(`/talent/${talent.id}`)}
    >
      {talent.is_pro_subscriber && <ProBadge size="sm" className="absolute top-3 right-3 z-10" />}
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/20">
          <img src={talent.picture_url || "/placeholder.svg"} alt={talent.artist_name} className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <h3 className="font-bold text-foreground truncate">{talent.artist_name}</h3>
        <p className="text-sm text-muted-foreground">{talent.act}</p>
        <div className="flex items-center justify-center text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 mr-1" />
          <span>{talent.location || 'Global'}</span>
        </div>
        <div className="flex justify-center pt-2">
          {talent.rate_per_hour ? (
            <div className="text-sm font-bold text-primary">
              {getCurrencySymbol(talent.currency)}{talent.rate_per_hour}<span className="font-normal text-muted-foreground text-xs">/hr</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Contact for rates</div>
          )}
        </div>
      </div>
    </Card>
  );
}

