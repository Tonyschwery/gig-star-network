
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, Music } from 'lucide-react';
import { countries } from '@/lib/countries';
import { SimpleGalleryUpload } from '@/components/SimpleGalleryUpload';
import { SimpleAvatarUpload } from '@/components/SimpleAvatarUpload';
import { ProFeatureWrapper } from '@/components/ProFeatureWrapper';
import { ProSubscriptionDialog } from '@/components/ProSubscriptionDialog';

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
  const [loading, setLoading] = useState(false);
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

      // Create talent profile
      const { error } = await supabase
        .from('talent_profiles')
        .insert({
          user_id: user.id,
          artist_name: formData.artistName,
          act: formData.act as any,
          gender: formData.gender as any,
          music_genres: allGenres,
          custom_genre: formData.customGenre || null,
          picture_url: pictureUrl,
          gallery_images: galleryImages,
          soundcloud_link: formData.soundcloudLink || null,
          youtube_link: formData.youtubeLink || null,
          biography: formData.biography,
          age: formData.age, // Now stores age range as string
          nationality: formData.countryOfResidence,
          rate_per_hour: parseFloat(formData.ratePerHour),
          currency: formData.currency,
          location: formData.location
        });

      if (error) {
        toast({
          title: "Profile creation failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Show success toast
      toast({
        title: "Profile created successfully!",
        description: "Welcome to our talent community",
      });

      // Force a page refresh to trigger auth state re-evaluation
      // This ensures the UserModeContext picks up the new talent profile
      setTimeout(() => {
        window.location.href = '/talent-dashboard';
      }, 1000);
    } catch (error) {
      console.error('Error creating profile:', error);
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl form-card border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Music className="h-6 w-6" />
            Complete Your Talent Profile
          </CardTitle>
          <p className="text-muted-foreground">
            Tell us about yourself to get started as a talent
          </p>
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
              <ProFeatureWrapper isProFeature={true}>
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
              <ProFeatureWrapper isProFeature={true}>
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
              <ProFeatureWrapper isProFeature={true}>
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
                    {countries.map((country) => (
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
              <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your talent location" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !formData.artistName || !formData.act || !formData.gender || formData.musicGenres.length === 0 || !formData.biography || !formData.age || !formData.countryOfResidence || !formData.ratePerHour || !formData.location || !pictureFile}
            >
              {loading ? "Creating Profile..." : "Complete Profile"}
            </Button>
          </form>

        </CardContent>
      </Card>
      
      {/* Pro Subscription CTA Dialog */}
      <ProSubscriptionDialog
        open={showProDialog}
        onOpenChange={setShowProDialog}
        onSubscribe={() => {
          toast({
            title: "Pro Features Activated! 🎉",
            description: "Your pro subscription will be activated shortly.",
            duration: 5000,
          });
        }}
        profileId="temp-id"
      />
    </div>
  );
}
