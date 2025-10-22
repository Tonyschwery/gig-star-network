export function HeroSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { detectedLocation, userLocation } = useLocationDetection();
  const [searchFilters, setSearchFilters] = useState({
    location: "",
    talentType: "all",
  });
  const [featuredTalents, setFeaturedTalents] = useState<TalentProfile[]>([]);

  const sortedCountries = sortCountriesByProximity(detectedLocation || userLocation, countries);

  useEffect(() => {
    fetchFeaturedTalents();
  }, []);

  const fetchFeaturedTalents = async () => {
    try {
      const { data, error } = await supabase
        .from("talent_profiles")
        .select(`id, artist_name, act, location, picture_url, is_pro_subscriber, rate_per_hour, currency, music_genres`)
        .eq("is_pro_subscriber", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching featured talents:", error);
        return;
      }

      setFeaturedTalents(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchFilters.location && searchFilters.location !== "all") {
      params.set("location", searchFilters.location);
    }
    if (searchFilters.talentType && searchFilters.talentType !== "all") {
      params.set("type", searchFilters.talentType);
    }

    const newUrl = params.toString() ? `/?${params.toString()}#talents` : "/#talents";
    navigate(newUrl);

    const hasFilters = searchFilters.location !== "all" || searchFilters.talentType !== "all";
    if (hasFilters) {
      setTimeout(() => {
        document.getElementById("talents")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  };

  return (
    <section className="relative flex flex-col justify-center pt-20 pb-16 sm:pt-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-brand-primary/5" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start lg:items-center">
          {/* LEFT SIDE */}
          <div className="space-y-8 animate-fadeIn text-center lg:text-left">
            <div className="space-y-4">
              <div className="text-accent font-medium text-lg">Connect with live talent</div>
              <h1 className="text-display leading-tight">
                Book <span className="text-accent">live talents</span> for your event
              </h1>
              <p className="text-subhead max-w-lg mx-auto lg:mx-0">
                Qtalent.live is the simplest way to find and book exceptional performers, artists, and creators for any
                occasion.
              </p>
            </div>

            {/* SEARCH FILTER CARD */}
            <Card className="p-4 sm:p-6 glass-card border border-border/50 shadow-elevated">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Location */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-foreground">WHERE</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Select
                      value={searchFilters.location}
                      onValueChange={(value) => setSearchFilters((prev) => ({ ...prev, location: value }))}
                    >
                      <SelectTrigger className="pl-9 h-11 text-sm bg-background/50 border-border/50">
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

                {/* Talent Type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-foreground">TALENT TYPE</label>
                  <div className="relative">
                    <Music className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Select
                      value={searchFilters.talentType}
                      onValueChange={(value) => setSearchFilters((prev) => ({ ...prev, talentType: value }))}
                    >
                      <SelectTrigger className="pl-9 h-11 text-sm bg-background/50 border-border/50">
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

                {/* Button */}
                <div className="flex items-end">
                  <Button
                    className="w-full h-11 font-semibold text-sm shadow hover:shadow-lg transition-all"
                    onClick={handleSearch}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Explore
                  </Button>
                </div>
              </div>
            </Card>

            {/* SOCIAL PROOF */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-sm mt-4">
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
              <div className="hidden sm:block h-4 w-px bg-border"></div>
              <div className="text-muted-foreground">
                <strong className="text-foreground">500+</strong> professional artists
              </div>
            </div>
          </div>

          {/* RIGHT SIDE (FEATURED ARTISTS) */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="flex flex-col items-center lg:items-start space-y-2">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <Crown className="h-6 w-6 text-brand-warning" />
                <h3 className="text-xl font-bold">Featured Pro Artists</h3>
              </div>
              <p className="text-sm text-muted-foreground">Premium verified talents with unlimited bookings</p>
            </div>

            {featuredTalents.length > 0 ? (
              <div className="w-full overflow-hidden">
                <Carousel
                  opts={{ align: "start", loop: true }}
                  plugins={[
                    Autoplay({
                      delay: 3000,
                      stopOnInteraction: true,
                    }) as any,
                  ]}
                >
                  <CarouselContent className="flex gap-4 px-2 sm:px-0">
                    {featuredTalents.map((talent) => (
                      <CarouselItem key={talent.id} className="basis-[85%] sm:basis-1/2 md:basis-1/3">
                        <FeaturedTalentCard
                          id={talent.id}
                          name={talent.artist_name}
                          location={talent.location || "Location not specified"}
                          category={
                            talent.act.toLowerCase() === "dj"
                              ? "DJ"
                              : talent.act.charAt(0).toUpperCase() + talent.act.slice(1)
                          }
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
              </div>
            ) : (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="p-4 glass-card h-32 bg-muted/50 animate-pulse"></Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
