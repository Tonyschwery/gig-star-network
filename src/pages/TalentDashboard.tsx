import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { countries, musicGenres, actTypes } from "@/lib/countries";
import { 
  User, 
  Edit3, 
  Upload, 
  MapPin, 
  DollarSign, 
  Music, 
  ExternalLink,
  LogOut,
  Camera,
  X,
  Plus
} from "lucide-react";

interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  gender: string;
  age: number;
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
}

const TalentDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [customGenre, setCustomGenre] = useState('');

  // Initialize selected genres when profile loads
  useEffect(() => {
    if (profile) {
      setSelectedGenres(profile.music_genres || []);
      setCustomGenre(profile.custom_genre || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTalentProfile();
  }, [user, navigate]);

  const fetchTalentProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (!data) {
        navigate('/talent-onboarding');
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !profile) return;

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('talent-pictures')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('talent-pictures')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('talent_profiles')
        .update({ picture_url: urlData.publicUrl })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      setProfile({ ...profile, picture_url: urlData.publicUrl });
      toast({
        title: "Success",
        description: "Profile picture updated successfully!"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSaveProfile = async () => {
    if (!profile || !user) return;

    try {
      // Prepare music genres array
      const allGenres = [...selectedGenres];
      if (customGenre.trim()) {
        allGenres.push(customGenre.trim());
      }

      const { error } = await supabase
        .from('talent_profiles')
        .update({
          act: profile.act as any,
          location: profile.location,
          nationality: profile.nationality,
          music_genres: allGenres,
          custom_genre: customGenre.trim() || null,
          soundcloud_link: profile.soundcloud_link,
          youtube_link: profile.youtube_link,
          biography: profile.biography,
          rate_per_hour: profile.rate_per_hour
        })
        .eq('id', profile.id);

      if (error) {
        throw error;
      }

      // Update local profile state
      setProfile({
        ...profile,
        music_genres: allGenres,
        custom_genre: customGenre.trim() || undefined
      });

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <Button onClick={() => navigate('/talent-onboarding')}>
            Complete Your Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              Welcome, {profile.artist_name}!
            </h1>
            <p className="text-muted-foreground">Manage your talent profile</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/talent/${profile.id}`)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Profile
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Picture Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="relative inline-block">
                <img
                  src={profile.picture_url || "/placeholder.svg"}
                  alt={profile.artist_name}
                  className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-primary/20"
                />
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="picture-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('picture-upload')?.click()}
                  disabled={uploadingImage}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingImage ? "Uploading..." : "Change Picture"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profile Info Card */}
          <Card className="glass-card md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Profile Information
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Artist Name</Label>
                  <div className="p-2 bg-muted rounded">{profile.artist_name}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Act Type</Label>
                  {isEditing ? (
                    <Select value={profile.act} onValueChange={(value) => setProfile({ ...profile, act: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {actTypes.map((act) => (
                          <SelectItem key={act} value={act.toLowerCase()}>
                            {act}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-muted rounded capitalize">{profile.act}</div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Talent Location (Where you're available)</Label>
                  {isEditing ? (
                    <Select value={profile.location || ''} onValueChange={(value) => setProfile({ ...profile, location: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-muted rounded flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {profile.location || 'Not specified'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Nationality</Label>
                  {isEditing ? (
                    <Select value={profile.nationality || ''} onValueChange={(value) => setProfile({ ...profile, nationality: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select nationality" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-muted rounded">{profile.nationality}</div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Rate per Hour</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={profile.rate_per_hour || ''}
                      onChange={(e) => setProfile({ 
                        ...profile, 
                        rate_per_hour: parseFloat(e.target.value) || 0 
                      })}
                      placeholder="Enter rate"
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {profile.rate_per_hour ? `${profile.rate_per_hour} ${profile.currency}` : 'Not set'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Music Genres</Label>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {musicGenres.map((genre) => (
                        <div key={genre} className="flex items-center space-x-2">
                          <Checkbox
                            id={genre}
                            checked={selectedGenres.includes(genre)}
                            onCheckedChange={() => handleGenreToggle(genre)}
                          />
                          <Label htmlFor={genre} className="text-sm">{genre}</Label>
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label htmlFor="customGenre" className="text-sm font-medium">Custom Genre</Label>
                      <Input
                        id="customGenre"
                        value={customGenre}
                        onChange={(e) => setCustomGenre(e.target.value)}
                        placeholder="Add your own genre"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.music_genres.map((genre) => (
                      <Badge key={genre} variant="secondary">
                        {genre}
                      </Badge>
                    ))}
                    {profile.custom_genre && (
                      <Badge variant="secondary">{profile.custom_genre}</Badge>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Biography</Label>
                {isEditing ? (
                  <Textarea
                    value={profile.biography}
                    onChange={(e) => setProfile({ ...profile, biography: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <div className="p-2 bg-muted rounded">{profile.biography}</div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">SoundCloud Link</Label>
                  {isEditing ? (
                    <Input
                      value={profile.soundcloud_link || ''}
                      onChange={(e) => setProfile({ ...profile, soundcloud_link: e.target.value })}
                      placeholder="https://soundcloud.com/..."
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded">
                      {profile.soundcloud_link ? (
                        <a href={profile.soundcloud_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {profile.soundcloud_link}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">YouTube Link</Label>
                  {isEditing ? (
                    <Input
                      value={profile.youtube_link || ''}
                      onChange={(e) => setProfile({ ...profile, youtube_link: e.target.value })}
                      placeholder="https://youtube.com/..."
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded">
                      {profile.youtube_link ? (
                        <a href={profile.youtube_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {profile.youtube_link}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </div>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile}>
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TalentDashboard;