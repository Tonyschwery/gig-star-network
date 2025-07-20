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

export default function TalentOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
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
    countryOfResidence: ''
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

  const handlePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      setPictureFile(file);
    }
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
          soundcloud_link: formData.soundcloudLink || null,
          youtube_link: formData.youtubeLink || null,
          biography: formData.biography,
          age: parseInt(formData.age),
          country_of_residence: formData.countryOfResidence
        });

      if (error) {
        toast({
          title: "Profile creation failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Profile created successfully!",
        description: "Welcome to our talent community",
      });

      navigate('/');
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
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
            <div className="space-y-3">
              <Label>Music Genres * (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-3">
                {MUSIC_GENRES.map((genre) => (
                  <div key={genre} className="flex items-center space-x-2">
                    <Checkbox
                      id={genre}
                      checked={formData.musicGenres.includes(genre)}
                      onCheckedChange={(checked) => handleGenreChange(genre, !!checked)}
                    />
                    <Label htmlFor={genre} className="text-sm">{genre}</Label>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Label htmlFor="customGenre">Custom Genre</Label>
                <Input
                  id="customGenre"
                  placeholder="Enter your own style"
                  value={formData.customGenre}
                  onChange={(e) => setFormData(prev => ({ ...prev, customGenre: e.target.value }))}
                />
              </div>
            </div>

            {/* Picture Upload */}
            <div className="space-y-2">
              <Label htmlFor="picture">Profile Picture *</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="picture"
                  type="file"
                  accept="image/*"
                  onChange={handlePictureUpload}
                  required
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              {pictureFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {pictureFile.name}
                </p>
              )}
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Age and Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  min="16"
                  max="100"
                  value={formData.age}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country of Residence *</Label>
                <Input
                  id="country"
                  value={formData.countryOfResidence}
                  onChange={(e) => setFormData(prev => ({ ...prev, countryOfResidence: e.target.value }))}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !formData.artistName || !formData.act || !formData.gender || formData.musicGenres.length === 0 || !formData.biography || !formData.age || !formData.countryOfResidence || !pictureFile}
            >
              {loading ? "Creating Profile..." : "Complete Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}