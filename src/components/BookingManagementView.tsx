import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Edit3, 
  MapPin, 
  DollarSign, 
  ExternalLink,
  LogOut,
  Camera,
  Crown
} from "lucide-react";

import { ProSubscriptionDialog } from "@/components/ProSubscriptionDialog";
import { BookingRequests } from "@/components/BookingRequests";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ModeSwitch } from "@/components/ModeSwitch";
import { GigOpportunities } from "@/components/GigOpportunities";


interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  gender: string;
  age: string;
  location?: string;
  rate_per_hour?: number;
  currency: string;
  music_genres: string[];
  custom_genre?: string;
  picture_url?: string;
  gallery_images?: string[];
  soundcloud_link?: string;
  youtube_link?: string;
  biography: string;
  nationality: string;
  created_at: string;
  is_pro_subscriber?: boolean;
  subscription_started_at?: string;
}

interface BookingManagementViewProps {
  title: string;
  subtitle?: string;
}

export const BookingManagementView = ({ 
  title, 
  subtitle = "Manage your talent profile"
}: BookingManagementViewProps) => {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProDialog, setShowProDialog] = useState(false);

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

  const handleCancelSubscription = async () => {
    if (!user || !session) return;

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to open customer portal');
      }

      if (data?.url) {
        // Open Stripe customer portal in new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management portal. Please try again.",
        variant: "destructive",
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
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                  {title.replace('{name}', profile.artist_name)}
                </h1>
                {profile.is_pro_subscriber && (
                  <Badge className="pro-badge">
                    <Crown className="h-3 w-3 mr-1" />
                    PRO
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>
            </div>
            
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Switch to Booking Button - appears only on talent dashboard */}
            <ModeSwitch size="sm" />
            
            {/* Edit Profile Button - Primary Action */}
            <Button
              onClick={() => navigate('/talent-profile-edit')}
              className="flex-shrink-0"
              size="sm"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Edit Profile</span>
              <span className="sm:hidden">Edit</span>
            </Button>
            
            {/* Pro/Subscription Button */}
            {!profile.is_pro_subscriber ? (
              <Button 
                onClick={() => setShowProDialog(true)}
                className="hero-button flex-shrink-0"
                size="sm"
              >
                <Crown className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Subscribe to Pro</span>
                <span className="sm:hidden">Pro</span>
              </Button>
            ) : (
              <Button 
                onClick={handleCancelSubscription}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 flex-shrink-0"
                size="sm"
              >
                <span className="hidden sm:inline">Cancel Pro</span>
                <span className="sm:hidden">Cancel</span>
              </Button>
            )}
            
            
            {/* Sign Out */}
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="flex-shrink-0"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Logout</span>
            </Button>
          </div>
        </div>

        {/* Notification Center */}
        <div className="mb-6">
          <div data-notification-center>
            <NotificationCenter />
          </div>
        </div>

        {/* Booking Requests Section */}
        {profile && (
          <div className="mb-6 md:mb-8">
            <BookingRequests 
              talentId={profile.id} 
              isProSubscriber={profile.is_pro_subscriber || false}
            />
          </div>
        )}

        {/* Gig Opportunities Section - Pro Feature */}
        {profile && (
          <div className="mb-6 md:mb-8">
            <GigOpportunities 
              talentId={profile.id} 
              isProSubscriber={profile.is_pro_subscriber || false}
            />
          </div>
        )}


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {/* Profile Picture Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center text-sm sm:text-base">
                <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                {profile.picture_url ? (
                  <img 
                    src={profile.picture_url} 
                    alt={profile.artist_name}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-primary/20"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-muted flex items-center justify-center border-4 border-primary/20">
                    <User className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4">
                Click Edit Profile to change your picture
              </p>
            </CardContent>
          </Card>

          {/* Photo Gallery Card */}
          <Card className="glass-card col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center text-sm sm:text-base">
                <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Photo Gallery
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Upload up to 5 additional photos to showcase your talent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                {profile.gallery_images && profile.gallery_images.length > 0 ? 
                  profile.gallery_images.map((imageUrl, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={imageUrl} 
                        alt={`Gallery image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )) : (
                  <div className="col-span-full text-center py-8 md:py-12">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Camera className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2 text-sm md:text-base">No Gallery Photos</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Click Edit Profile to add photos to your gallery
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profile Info Card */}
          <Card className="glass-card col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center text-sm sm:text-base">
                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Artist Name</Label>
                  <div className="p-2 bg-muted rounded text-xs sm:text-sm">{profile.artist_name}</div>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Act Type</Label>
                  <div className="p-2 bg-muted rounded capitalize text-xs sm:text-sm">{profile.act}</div>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs sm:text-sm font-medium">Talent Location (Where you're available)</Label>
                  <div className="p-2 bg-muted rounded flex items-center text-xs sm:text-sm">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {profile.location || 'Not specified'}
                  </div>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Nationality</Label>
                  <div className="p-2 bg-muted rounded text-xs sm:text-sm">{profile.nationality}</div>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Rate per Hour</Label>
                  <div className="p-2 bg-muted rounded flex items-center text-xs sm:text-sm">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {profile.rate_per_hour ? `${profile.rate_per_hour} ${profile.currency}` : 'Not set'}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs sm:text-sm font-medium">Music Genres</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile.music_genres.map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                  {profile.custom_genre && (
                    <Badge variant="secondary" className="text-xs">{profile.custom_genre}</Badge>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs sm:text-sm font-medium">Biography</Label>
                <div className="p-2 bg-muted rounded text-xs sm:text-sm max-h-32 overflow-y-auto">{profile.biography}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm font-medium">SoundCloud Link</Label>
                  <div className="p-2 bg-muted rounded text-xs sm:text-sm">
                    {profile.soundcloud_link ? (
                      <a href={profile.soundcloud_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                        {profile.soundcloud_link.length > 30 ? `${profile.soundcloud_link.substring(0, 30)}...` : profile.soundcloud_link}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium">YouTube Link</Label>
                  <div className="p-2 bg-muted rounded text-xs sm:text-sm">
                    {profile.youtube_link ? (
                      <a href={profile.youtube_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                        {profile.youtube_link.length > 30 ? `${profile.youtube_link.substring(0, 30)}...` : profile.youtube_link}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pro Subscription Dialog */}
        <ProSubscriptionDialog
          open={showProDialog}
          onOpenChange={setShowProDialog}
          onSubscribe={() => {
            // Refresh profile to show pro status
            fetchTalentProfile();
          }}
          profileId={profile.id}
        />
      </div>
    </div>
  );
};