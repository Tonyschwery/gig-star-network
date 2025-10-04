
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from 'lodash';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, Music } from 'lucide-react';
import { countries, sortCountriesByProximity } from '@/lib/countries';
import { SimpleGalleryUpload } from '@/components/SimpleGalleryUpload';
import { SimpleAvatarUpload } from '@/components/SimpleAvatarUpload';
import { ProFeatureWrapper } from '@/components/ProFeatureWrapper';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { useLocationDetection } from '@/hooks/useLocationDetection';
import { LocationSelector } from '@/components/LocationSelector';
import { useAuth } from '@/hooks/useAuth';

const MUSIC_GENRES = [
  'afro-house',
  'organic/downtempo',
  'house',
  'open format',
  'arabic',
  'bollywood',
  'rock',
  "80's",
  "70's",
  'deep house',
  'disco house',
  'amapiano',
  'rnb & hiphop',
  "90's"
];

const ACTS = [
  { value: 'dj', label: 'DJ' },
  { value: 'band', label: 'Band' },
  { value: 'saxophonist', label: 'Saxophonist' },
  { value: 'percussionist', label: 'Percussionist' },
  { value: 'singer', label: 'Singer' },
  { value: 'keyboardist', label: 'Keyboardist' },
  { value: 'drummer', label: 'Drummer' }
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'AED', label: 'AED (د.إ)' },
  { value: 'SAR', label: 'SAR (ر.س)' },
  { value: 'QAR', label: 'QAR (ر.ق)' },
  { value: 'KWD', label: 'KWD (د.ك)' },
  { value: 'BHD', label: 'BHD (.د.ب)' },
  { value: 'OMR', label: 'OMR (ر.ع.)' },
  { value: 'JOD', label: 'JOD (د.ا)' },
  { value: 'LBP', label: 'LBP (ل.ل)' },
  { value: 'EGP', label: 'EGP (ج.م)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'CHF', label: 'CHF (₣)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'INR', label: 'INR (₹)' },
  { value: 'SGD', label: 'SGD ($)' },
  { value: 'HKD', label: 'HKD ($)' },
  { value: 'NZD', label: 'NZD ($)' },
  { value: 'SEK', label: 'SEK (kr)' },
  { value: 'NOK', label: 'NOK (kr)' },
  { value: 'DKK', label: 'DKK (kr)' },
  { value: 'PLN', label: 'PLN (zł)' },
  { value: 'CZK', label: 'CZK (Kč)' },
  { value: 'HUF', label: 'HUF (Ft)' },
  { value: 'RON', label: 'RON (lei)' },
  { value: 'BGN', label: 'BGN (лв)' },
  { value: 'HRK', label: 'HRK (kn)' },
  { value: 'RUB', label: 'RUB (₽)' },
  { value: 'TRY', label: 'TRY (₺)' },
  { value: 'ILS', label: 'ILS (₪)' },
  { value: 'ZAR', label: 'ZAR (R)' },
  { value: 'MXN', label: 'MXN ($)' },
  { value: 'BRL', label: 'BRL (R$)' },
  { value: 'CLP', label: 'CLP ($)' },
  { value: 'COP', label: 'COP ($)' },
  { value: 'PEN', label: 'PEN (S/)' },
  { value: 'UYU', label: 'UYU ($)' },
  { value: 'ARS', label: 'ARS ($)' },
  { value: 'THB', label: 'THB (฿)' },
  { value: 'MYR', label: 'MYR (RM)' },
  { value: 'IDR', label: 'IDR (Rp)' },
  { value: 'PHP', label: 'PHP (₱)' },
  { value: 'VND', label: 'VND (₫)' },
  { value: 'KRW', label: 'KRW (₩)' },
  { value: 'TWD', label: 'TWD (NT$)' }
];

export default function TalentOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, onboardingComplete, onboardingDraft, refreshProfile } = useAuth();
  const { sendTalentProfileEmails } = useEmailNotifications();
  const { userLocation, detectedLocation, saveLocation } = useLocationDetection();
  const [loading, setLoading] = useState(false);
  const [pageInitialized, setPageInitialized] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [showProDialog, setShowProDialog] = useState(false);
  const [formData, setFormData] = useState({
    artistName: '',
    act: '',
    gender: '',
    musicGenres: [] as string[],
    customGenre: '',
    soundcloudLink: '',
    youtubeLink: '',
    biography: '',
    age: '',
    countryOfResidence: '',
    ratePerHour: '',
    currency: 'USD',
    location: ''
  });

  // Load draft data from Supabase on mount
  useEffect(() => {
    if (onboardingDraft && !draftLoaded) {
      console.log('[TalentOnboarding] Loading draft from Supabase:', onboardingDraft);
      
      setFormData(prev => ({
        ...prev,
        artistName: onboardingDraft.artistName || prev.artistName,
        act: onboardingDraft.act || prev.act,
        gender: onboardingDraft.gender || prev.gender,
        musicGenres: onboardingDraft.musicGenres || prev.musicGenres,
        customGenre: onboardingDraft.customGenre || prev.customGenre,
        soundcloudLink: onboardingDraft.soundcloudLink || prev.soundcloudLink,
        youtubeLink: onboardingDraft.youtubeLink || prev.youtubeLink,
        biography: onboardingDraft.biography || prev.biography,
        age: onboardingDraft.age || prev.age,
        countryOfResidence: onboardingDraft.countryOfResidence || prev.countryOfResidence,
        ratePerHour: onboardingDraft.ratePerHour || prev.ratePerHour,
        currency: onboardingDraft.currency || prev.currency,
        location: onboardingDraft.location || prev.location,
      }));
      
      setDraftLoaded(true);
    }
  }, [onboardingDraft, draftLoaded]);

  // Redirect if already completed onboarding
  useEffect(() => {
    if (!authLoading && onboardingComplete) {
      console.log('[TalentOnboarding] Onboarding already complete, redirecting to dashboard');
      navigate('/talent-dashboard', { replace: true });
    }
  }, [authLoading, onboardingComplete, navigate]);

  // Initialize page state - validate session
  useEffect(() => {
    const initializePage = async () => {
      if (authLoading) {
        console.log('[TalentOnboarding] Waiting for auth to load');
        return;
      }

      console.log('[TalentOnboarding] Auth loaded, validating session');
      
      // Validate session is actually valid using getUser() instead of cached session
      const { data: { user: validatedUser }, error } = await supabase.auth.getUser();
      
      if (error || !validatedUser) {
        console.log('[TalentOnboarding] Session invalid, redirecting to auth');
        navigate('/auth', { state: { mode: 'talent' }, replace: true });
        return;
      }

      console.log('[TalentOnboarding] Session valid');
      setPageInitialized(true);
    };

    initializePage();
  }, [authLoading, user, navigate]);

  // Debounced autosave function
  const saveDraftToSupabase = useCallback(
    debounce(async (draftData: any) => {
      if (!user) return;
      
      setIsSavingDraft(true);
      console.log('[TalentOnboarding] Autosaving draft to Supabase');
      
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_draft: draftData })
        .eq('id', user.id);
      
      if (error) {
        console.error('[TalentOnboarding] Error saving draft:', error);
      } else {
        console.log('[TalentOnboarding] Draft saved successfully');
      }
      
      setIsSavingDraft(false);
    }, 1500),
    [user]
  );

  // Auto-save draft whenever form data changes
  useEffect(() => {
    if (!user || !draftLoaded) return;

    const draftData = {
      ...formData,
      galleryImages,
      profileImageUrl,
    };

    saveDraftToSupabase(draftData);
  }, [formData, galleryImages, profileImageUrl, user, draftLoaded, saveDraftToSupabase]);

  // Update form location when user location changes
  useEffect(() => {
    const currentLocation = userLocation || detectedLocation;
    if (currentLocation && currentLocation !== 'Worldwide' && !formData.location) {
      setFormData(prev => ({ ...prev, location: currentLocation }));
    }
  }, [userLocation, detectedLocation, formData.location]);

  const handleLocationChange = (location: string) => {
    setFormData(prev => ({ ...prev, location }));
  };

  const handleGenreChange = (genre: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        musicGenres: [...prev.musicGenres, genre]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        musicGenres: prev.musicGenres.filter(g => g !== genre)
      }));
    }
  };

  const handleAvatarImageChange = (imageUrl: string | null) => {
    setProfileImageUrl(imageUrl);
  };

  const handleAvatarFileChange = (file: File | null) => {
    setPictureFile(file);
  };

  const uploadPicture = async (userId: string): Promise<string | null> => {
    if (!pictureFile) return null;

    const fileExt = pictureFile.name.split('.').pop();
    const fileName = `${userId}/profile.${fileExt}`;

    const { error } = await supabase.storage
      .from('talent-pictures')
      .upload(fileName, pictureFile, { upsert: true });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = supabase.storage
      .from('talent-pictures')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication error",
          description: "Please sign in again",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Check if user is Pro subscriber (for Pro features)
      const { data: existingProfile } = await supabase
        .from('talent_profiles')
        .select('is_pro_subscriber')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const isProUser = existingProfile?.is_pro_subscriber || false;

      // Upload picture if provided
      let pictureUrl = null;
      if (pictureFile) {
        pictureUrl = await uploadPicture(user.id);
        if (!pictureUrl) {
          toast({
            title: "Upload failed",
            description: "Failed to upload profile picture",
            variant: "destructive",
          });
          return;
        }
      }

      // Prepare music genres array
      const allGenres = [...formData.musicGenres];
      if (formData.customGenre.trim()) {
        allGenres.push(formData.customGenre.trim());
      }

      // Create talent profile - only include Pro features if user is Pro
      const profileData = {
        user_id: user.id,
        artist_name: formData.artistName,
        act: formData.act as any,
        gender: formData.gender as any,
        music_genres: allGenres,
        custom_genre: formData.customGenre || null,
        picture_url: pictureUrl,
        // Only save Pro features if user is Pro
        gallery_images: isProUser ? galleryImages : [],
        soundcloud_link: isProUser ? (formData.soundcloudLink || null) : null,
        youtube_link: isProUser ? (formData.youtubeLink || null) : null,
        biography: formData.biography,
        age: formData.age, // Now stores age range as string
        nationality: formData.countryOfResidence,
        rate_per_hour: parseFloat(formData.ratePerHour),
        currency: formData.currency,
        location: formData.location || userLocation || detectedLocation || ''
      };

      const { data: talentProfile, error } = await supabase
        .from('talent_profiles')
        .insert(profileData)
        .select('id')
        .single();

      if (error) {
        toast({
          title: "Profile creation failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('[TalentOnboarding] Profile created, marking onboarding complete');
      
      // Mark onboarding as complete in profiles table
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ 
          onboarding_complete: true,
          onboarding_draft: null // Clear draft after completion
        })
        .eq('id', user.id);

      if (profileUpdateError) {
        console.error('[TalentOnboarding] Error updating profile onboarding status:', profileUpdateError);
      }

      // Show success toast
      toast({
        title: "Profile created successfully!",
        description: "Welcome to our talent community",
      });

      // Refresh auth context to update onboarding status
      await refreshProfile();
      
      // Validate session before navigation to ensure it's still valid
      const { data: { user: validatedUser }, error: validationError } = await supabase.auth.getUser();
      
      if (validationError || !validatedUser) {
        console.error('[TalentOnboarding] Session invalid after profile creation');
        toast({
          title: "Session Error",
          description: "Please log in again to continue.",
          variant: "destructive"
        });
        navigate('/auth', { state: { mode: 'talent' }, replace: true });
        return;
      }

      console.log('[TalentOnboarding] Session valid, navigating to dashboard');
      navigate('/talent-dashboard', { replace: true });
    } catch (error) {
      console.error('[TalentOnboarding] Error creating profile:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const showProSubscriptionCTA = () => {
    toast({
      title: "Profile created successfully!",
      description: "Welcome to our talent community",
    });
    
    // Show pro subscription dialog after a short delay
    setTimeout(() => {
      setShowProDialog(true);
    }, 1000);
  };

  // Sort countries by proximity for location dropdowns
  const currentLocation = userLocation || detectedLocation;
  const sortedCountries = sortCountriesByProximity(currentLocation, countries);

  // Get current location for validation
  const selectedLocation = formData.location || userLocation || detectedLocation;

  // Show loading spinner while auth is loading or page is initializing
  if (authLoading || !pageInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl form-card border-0">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Music className="h-6 w-6" />
                Complete Your Talent Profile
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Tell us about yourself to get started as a talent
              </p>
            </div>
            {isSavingDraft && (
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                Saving draft...
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Artist Name */}
            <div className="space-y-2">
              <Label htmlFor="artistName">Artist Name *</Label>
              <Input
                id="artistName"
                value={formData.artistName}
                onChange={(e) => setFormData(prev => ({ ...prev, artistName: e.target.value }))}
                required
              />
            </div>

            {/* Act */}
            <div className="space-y-2">
              <Label>Act *</Label>
              <Select value={formData.act} onValueChange={(value) => setFormData(prev => ({ ...prev, act: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your act" />
                </SelectTrigger>
                <SelectContent>
                  {ACTS.map((act) => (
                    <SelectItem key={act.value} value={act.value}>
                      {act.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>Gender *</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Music Genres */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Music Genres * (Select all that apply)</Label>
              <div className="flex flex-wrap gap-3">
                {MUSIC_GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    className={`genre-bubble ${formData.musicGenres.includes(genre) ? 'selected' : ''}`}
                    onClick={() => handleGenreChange(genre, !formData.musicGenres.includes(genre))}
                  >
                    {genre}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <Label htmlFor="customGenre" className="text-sm font-medium">Custom Genre</Label>
                <Input
                  id="customGenre"
                  placeholder="Enter your own style"
                  value={formData.customGenre}
                  onChange={(e) => setFormData(prev => ({ ...prev, customGenre: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Picture Upload */}
            <div className="space-y-2">
              <Label>Profile Picture *</Label>
              <SimpleAvatarUpload
                currentImage={profileImageUrl}
                onImageChange={handleAvatarImageChange}
                onFileChange={handleAvatarFileChange}
                disabled={loading}
              />
            </div>

            {/* Gallery Photos */}
            <div className="space-y-2">
              <Label>Additional Photos (Optional)</Label>
              <ProFeatureWrapper isProFeature={true} context="onboarding">
                <SimpleGalleryUpload
                  currentImages={galleryImages}
                  onImagesChange={setGalleryImages}
                  maxImages={5}
                  disabled={loading}
                />
              </ProFeatureWrapper>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProFeatureWrapper isProFeature={true} context="onboarding">
                <div className="space-y-2">
                  <Label htmlFor="soundcloud">SoundCloud Link</Label>
                  <Input
                    id="soundcloud"
                    type="url"
                    placeholder="https://soundcloud.com/your-profile"
                    value={formData.soundcloudLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, soundcloudLink: e.target.value }))}
                  />
                </div>
              </ProFeatureWrapper>
              <ProFeatureWrapper isProFeature={true} context="onboarding">
                <div className="space-y-2">
                  <Label htmlFor="youtube">YouTube Link</Label>
                  <Input
                    id="youtube"
                    type="url"
                    placeholder="https://youtube.com/your-channel"
                    value={formData.youtubeLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, youtubeLink: e.target.value }))}
                  />
                </div>
              </ProFeatureWrapper>
            </div>

            {/* Biography */}
            <div className="space-y-2">
              <Label htmlFor="biography">Biography *</Label>
              <Textarea
                id="biography"
                placeholder="Tell us about yourself and your musical journey..."
                value={formData.biography}
                onChange={(e) => setFormData(prev => ({ ...prev, biography: e.target.value }))}
                required
                rows={4}
              />
            </div>

            {/* Age and Nationality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Age Range *</Label>
                <Select value={formData.age} onValueChange={(value) => setFormData(prev => ({ ...prev, age: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your age range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20-30">20-30</SelectItem>
                    <SelectItem value="30-40">30-40</SelectItem>
                    <SelectItem value="40-50">40-50</SelectItem>
                    <SelectItem value="50-60">50-60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nationality *</Label>
                <Select value={formData.countryOfResidence} onValueChange={(value) => setFormData(prev => ({ ...prev, countryOfResidence: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your nationality" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {sortedCountries.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rate and Currency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Rate per Hour *</Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="100.00"
                  value={formData.ratePerHour}
                  onChange={(e) => setFormData(prev => ({ ...prev, ratePerHour: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Currency *</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                   <SelectContent className="max-h-[200px]">
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Talent Location */}
            <div className="space-y-2">
              <Label>Talent Location *</Label>
              <div className="flex justify-start">
                <LocationSelector />
              </div>
              <p className="text-xs text-muted-foreground">
                Selected location: {selectedLocation || 'Not selected'}
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !formData.artistName || !formData.act || !formData.gender || formData.musicGenres.length === 0 || !formData.biography || !formData.age || !formData.countryOfResidence || !formData.ratePerHour || !selectedLocation || !pictureFile}
            >
              {loading ? "Creating Profile..." : "Complete Profile"}
            </Button>
          </form>

        </CardContent>
      </Card>
      
      {/* Pro Subscription CTA Dialog */}
      <SubscriptionModal
        open={showProDialog}
        onOpenChange={setShowProDialog}
      />
    </div>
  );
}
