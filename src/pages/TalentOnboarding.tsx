import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Music, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { countries } from "@/lib/countries";
import { SimpleAvatarUpload } from "@/components/SimpleAvatarUpload";
import { useLocationDetection } from "@/hooks/useLocationDetection";
import { LocationSelector } from "@/components/LocationSelector";
import { useAuth } from "@/hooks/useAuth";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

// Map country names to ISO country codes for PhoneInput
const getCountryCode = (countryName: string): string => {
  const countryMap: Record<string, string> = {
    'United States': 'US', 'United Kingdom': 'GB', 'Canada': 'CA', 'Australia': 'AU',
    'Germany': 'DE', 'France': 'FR', 'Spain': 'ES', 'Italy': 'IT', 'Netherlands': 'NL',
    'Belgium': 'BE', 'Switzerland': 'CH', 'Austria': 'AT', 'Sweden': 'SE', 'Norway': 'NO',
    'Denmark': 'DK', 'Finland': 'FI', 'Poland': 'PL', 'Czech Republic': 'CZ', 'Ireland': 'IE',
    'Portugal': 'PT', 'Greece': 'GR', 'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA',
    'Qatar': 'QA', 'Kuwait': 'KW', 'Bahrain': 'BH', 'Oman': 'OM', 'Egypt': 'EG',
    'South Africa': 'ZA', 'India': 'IN', 'China': 'CN', 'Japan': 'JP', 'South Korea': 'KR',
    'Singapore': 'SG', 'Malaysia': 'MY', 'Thailand': 'TH', 'Indonesia': 'ID', 'Philippines': 'PH',
    'Vietnam': 'VN', 'Brazil': 'BR', 'Argentina': 'AR', 'Mexico': 'MX', 'Chile': 'CL',
    'Colombia': 'CO', 'Peru': 'PE', 'Turkey': 'TR', 'Israel': 'IL', 'Lebanon': 'LB',
    'Jordan': 'JO', 'Morocco': 'MA', 'Tunisia': 'TN', 'Algeria': 'DZ', 'Nigeria': 'NG',
    'Kenya': 'KE', 'Ghana': 'GH', 'New Zealand': 'NZ', 'Russia': 'RU', 'Ukraine': 'UA',
  };
  return countryMap[countryName] || 'US';
};

const MUSIC_GENRES = [
  "afro-house",
  "organic/downtempo",
  "house",
  "open format",
  "arabic",
  "bollywood",
  "rock",
  "80's",
  "70's",
  "deep house",
  "disco house",
  "amapiano",
  "rnb & hiphop",
  "90's",
];

const ACTS = [
  { value: "dj", label: "DJ" },
  { value: "band", label: "Band" },
  { value: "singer", label: "Singer" },
  { value: "saxophonist", label: "Saxophonist" },
  { value: "keyboardist", label: "Keyboardist" },
  { value: "drummer", label: "Drummer" },
  { value: "percussionist", label: "Percussionist" },
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "AED", label: "AED (د.إ)" },
  { value: "SAR", label: "SAR (ر.س)" },
  { value: "QAR", label: "QAR (ر.ق)" },
];

export default function TalentOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { userLocation, detectedLocation, detectLocation } = useLocationDetection();
  const [loading, setLoading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [signupMessageVisible, setSignupMessageVisible] = useState(false);
  const [emailConfirmationPending, setEmailConfirmationPending] = useState(false);
  const [userEmailForConfirmation, setUserEmailForConfirmation] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [formData, setFormData] = useState({
    artistName: "",
    act: "",
    gender: "",
    musicGenres: [] as string[],
    customGenre: "",
    soundcloudLink: "",
    youtubeLink: "",
    biography: "",
    age: "",
    countryOfResidence: "",
    ratePerHour: "",
    currency: "USD",
    location: "",
  });

  // Email confirmation is now handled by AuthCallback.tsx for auto-login

  useEffect(() => {
    // If user is already authenticated and has a talent profile, redirect to dashboard
    if (!authLoading && user) {
      const checkProfile = async () => {
        const { data: talentProfile } = await supabase
          .from("talent_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (talentProfile) {
          console.log("[TalentOnboarding] User already has profile, redirecting to dashboard");
          navigate("/talent-dashboard", { replace: true });
        }
      };
      checkProfile();
    }
    
    // Load draft from localStorage for new signups
    if (!user && !draftLoaded) {
      const localDraft = localStorage.getItem("talent_onboarding_draft");
      if (localDraft) {
        try {
          const draft = JSON.parse(localDraft);
          setFormData((prev) => ({ ...prev, ...draft }));
          if (draft.email) setEmail(draft.email);
          if (draft.fullName) setFullName(draft.fullName);
          if (draft.phoneNumber) setPhoneNumber(draft.phoneNumber);
          if (draft.profileImageUrl) setProfileImageUrl(draft.profileImageUrl);
        } catch (error) {
          console.error("Error loading localStorage draft:", error);
        }
      }
      setDraftLoaded(true);
    }
  }, [user, authLoading, draftLoaded, navigate]);

  // Auto-sync detected location to form data
  useEffect(() => {
    const currentLocation = userLocation || detectedLocation;
    if (currentLocation && !formData.location) {
      console.log('[TalentOnboarding] Auto-syncing location to form:', currentLocation);
      setFormData(prev => ({ ...prev, location: currentLocation }));
    }
  }, [userLocation, detectedLocation, formData.location]);


  // Upload image immediately to preserve it across auth redirects
  const uploadImageImmediately = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const tempFileName = `temp/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("talent-pictures")
        .upload(tempFileName, file, { upsert: true });
      
      if (uploadError) {
        console.error("Image upload error:", uploadError);
        return null;
      }
      
      const { data } = supabase.storage.from("talent-pictures").getPublicUrl(tempFileName);
      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const uploadPicture = async (userId: string): Promise<string | null> => {
    if (!pictureFile) return profileImageUrl;
    const fileExt = pictureFile.name.split(".").pop();
    const fileName = `${userId}/profile.${fileExt}`;
    const { error } = await supabase.storage.from("talent-pictures").upload(fileName, pictureFile, { upsert: true });
    if (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("talent-pictures").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Fallback logic for an already logged-in user completing their profile.
      if (user) {
        const pictureUrl = await uploadPicture(user.id);
        if (!pictureUrl && pictureFile) {
          setLoading(false);
          return;
        }
        const allGenres = [...formData.musicGenres];
        if (formData.customGenre.trim()) allGenres.push(formData.customGenre.trim());
        const profileData = {
          user_id: user.id,
          artist_name: formData.artistName,
          act: formData.act as any,
          gender: formData.gender as any,
          music_genres: allGenres,
          biography: formData.biography,
          age: formData.age,
          nationality: formData.countryOfResidence,
          rate_per_hour: parseFloat(formData.ratePerHour),
          currency: formData.currency,
          location: formData.location || userLocation || detectedLocation || "",
          picture_url: pictureUrl,
        };
        const { error: upsertError } = await supabase.from("talent_profiles").upsert(profileData);
        if (upsertError) throw upsertError;
        toast({ title: "Success! 🎉", description: "Your talent profile is now live!" });
        localStorage.removeItem("talent_onboarding_draft");
        setTimeout(() => (window.location.href = "/talent-dashboard"), 1500);
        return;
      }

      // **MAIN LOGIC FOR NEW USERS**
      // This sends all form data to Supabase for the database trigger to process.
      if (!email || !fullName) {
        toast({
          variant: "destructive",
          title: "Missing information",
          description: "Please provide your email and full name.",
        });
        setLoading(false);
        return;
      }

      const allGenres = [...formData.musicGenres];
      if (formData.customGenre.trim()) {
        allGenres.push(formData.customGenre.trim());
      }

      const profileDataForDB = {
        artist_name: formData.artistName,
        act: formData.act,
        gender: formData.gender,
        music_genres: allGenres,
        biography: formData.biography,
        age: formData.age,
        nationality: formData.countryOfResidence,
        rate_per_hour: formData.ratePerHour ? parseFloat(formData.ratePerHour) : null,
        currency: formData.currency,
        location: formData.location || userLocation || detectedLocation || "",
        picture_url: profileImageUrl, // Include profile picture URL
      };

      // Check if user already exists via edge function
      const { data: emailCheck, error: checkError } = await supabase.functions.invoke('check-email-exists', {
        body: { email: email.toLowerCase().trim() }
      });

      if (checkError) {
        console.error('[TalentOnboarding] Error checking email:', checkError);
      }

      if (emailCheck?.exists) {
        toast({
          title: "Account already exists!",
          description: "This email is already registered. Please sign in instead.",
          variant: "destructive",
          duration: 5000,
        });
        setLoading(false);
        return;
      }

      // Validate all required fields
      const validationErrors = getValidationErrors();
      if (validationErrors.length > 0) {
        toast({
          title: "Missing Required Fields",
          description: `Please fill in: ${validationErrors.join(", ")}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validate password
      if (!password || password.length < 6) {
        toast({
          title: "Password Required",
          description: "Please enter a password with at least 6 characters.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            name: fullName,
            user_type: "talent",
            phone: phoneNumber,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error("Signup failed - no user returned");
      }

      // Create talent profile
      const profileData = {
        user_id: signUpData.user.id,
        artist_name: formData.artistName.trim(),
        act: formData.act as "dj" | "band" | "singer" | "saxophonist" | "keyboardist" | "drummer" | "percussionist",
        gender: formData.gender as "male" | "female",
        music_genres: allGenres,
        biography: formData.biography.trim(),
        age: formData.age,
        nationality: formData.countryOfResidence,
        rate_per_hour: parseFloat(formData.ratePerHour),
        currency: formData.currency,
        location: formData.location || userLocation || detectedLocation || "",
        picture_url: profileImageUrl || null,
        soundcloud_link: formData.soundcloudLink?.trim() || null,
        youtube_link: formData.youtubeLink?.trim() || null,
      };

      const { error: profileError } = await supabase
        .from("talent_profiles")
        .insert([profileData]);

      if (profileError) {
        console.error("[TalentOnboarding] Profile creation error:", profileError);
        throw new Error("Failed to create profile. Please contact support.");
      }

      // Clear draft and redirect
      localStorage.removeItem("talent_onboarding_draft");
      
      toast({ 
        title: "🎉 Welcome to Qtalent!", 
        description: "Taking you to your dashboard...",
      });

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/talent-dashboard';
      }, 1000);
      
      return;
    } catch (error: any) {
      console.error("[TalentOnboarding] Error:", error);
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenreChange = (genre: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      musicGenres: checked ? [...prev.musicGenres, genre] : prev.musicGenres.filter((g) => g !== genre),
    }));
  };

  const handleAvatarFileChange = async (file: File | null) => {
    setPictureFile(file);
    if (file) {
      // Show preview immediately
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setProfileImageUrl(reader.result as string);
      };
      
      // Upload to Supabase immediately to preserve across auth redirects
      const uploadedUrl = await uploadImageImmediately(file);
      if (uploadedUrl) {
        setProfileImageUrl(uploadedUrl);
        
        // Save to localStorage for new users
        if (!user) {
          const draft = {
            ...formData,
            profileImageUrl: uploadedUrl,
            email,
            fullName,
            phoneNumber
          };
          localStorage.setItem("talent_onboarding_draft", JSON.stringify(draft));
        }
        
        toast({ 
          title: "Image uploaded", 
          description: "Your profile picture has been saved!",
          duration: 2000 
        });
      }
    } else {
      setProfileImageUrl(null);
    }
  };

  const selectedLocation = formData.location || userLocation || detectedLocation;

  const getValidationErrors = () => {
    const errors: string[] = [];
    if (!user) {
      if (!email) errors.push("Email address");
      if (!fullName) errors.push("Full name");
    }
    if (!formData.artistName) errors.push("Artist name");
    if (!formData.act) errors.push("Act type");
    if (!formData.gender) errors.push("Gender");
    if (formData.musicGenres.length === 0) errors.push("At least one music genre");
    if (!formData.age) errors.push("Age range");
    if (!formData.countryOfResidence) errors.push("Country of residence");
    if (!formData.ratePerHour) errors.push("Rate per hour");
    if (!selectedLocation) errors.push("Location");
    if (user ? !profileImageUrl && !pictureFile : !pictureFile) errors.push("Profile picture");
    if (!formData.biography) errors.push("Biography");
    return errors;
  };

  // FULL SCREEN BLACK BLOCKING PAGE - Cannot bypass until email is confirmed
  if (emailConfirmationPending) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto space-y-8 py-8">
          {/* Animated Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/30">
                <Music className="h-12 w-12 text-primary animate-pulse" />
              </div>
            </div>
          </div>

          {/* Main Message */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              Confirm Your Email
            </h1>
            <p className="text-xl text-gray-300">
              One final step to activate your talent account
            </p>
          </div>

          {/* Email Sent Alert */}
          <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-lg font-semibold text-white">
                  Verification Email Sent
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  We've sent a verification link to{" "}
                  <span className="font-bold text-white">{userEmailForConfirmation}</span>
                </p>
                <p className="text-gray-400 text-sm">
                  Please check your inbox (and spam folder) and click the verification link to activate your account.
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
            <h4 className="font-semibold text-white text-lg mb-4">What happens next?</h4>
            <ol className="space-y-4">
              <li className="flex items-start gap-3 text-gray-300">
                <span className="flex-shrink-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                  1
                </span>
                <span className="pt-1">Check your email inbox and spam folder</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <span className="flex-shrink-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                  2
                </span>
                <span className="pt-1">Click the verification link in the email we sent you</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <span className="flex-shrink-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                  3
                </span>
                <span className="pt-1">After clicking the link, you'll be redirected to the login page where you can sign in with your credentials</span>
              </li>
            </ol>
          </div>

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-amber-200 text-sm text-center">
              ⚠️ <strong>Important:</strong> Your talent profile will not be visible to bookers until you confirm your email address.
            </p>
          </div>

          {/* Resend Email Option */}
          <div className="text-center space-y-3">
            <p className="text-gray-400 text-sm">Didn't receive the email?</p>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email: userEmailForConfirmation,
                  });
                  
                  if (error) throw error;
                  
                  toast({
                    title: "Email Resent! 📧",
                    description: "Check your inbox again. It may take a few minutes to arrive.",
                    duration: 5000
                  });
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to resend email. Please try again.",
                    variant: "destructive"
                  });
                }
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Resend Verification Email
            </Button>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-4">
            <p className="text-gray-500 text-xs">
              This page will automatically redirect once you confirm your email
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (signupMessageVisible) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Check Your Email!</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Magic Link Sent</AlertTitle>
              <AlertDescription>
                We've sent a sign-in link to **{email}**. Please click the link to confirm your account and continue.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background overflow-y-auto pb-safe">
      <div className="w-full max-w-2xl mx-auto p-3 sm:p-6">
        <Card className="w-full border-0 shadow-lg">
          <CardHeader className="text-center px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={(e) => {
                console.log('[TalentOnboarding] Back button clicked');
                e.preventDefault();
                e.stopPropagation();
                console.log('[TalentOnboarding] Navigating to /auth');
                window.location.href = '/auth';
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="flex-1">
              <CardTitle className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-2">
                <Music className="h-5 w-5 sm:h-6 sm:w-6" /> Complete Your Talent Profile
              </CardTitle>
              <p className="text-muted-foreground mt-2 text-sm">Tell us about yourself to get started as a talent</p>
            </div>
            <div className="w-[60px]"></div>
          </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
            {!user && (
              <div className="space-y-3 sm:space-y-4 pb-4 sm:pb-6 border-b border-border">
                <h3 className="text-base sm:text-lg font-semibold">Account Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required={!user}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required={!user}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                  <PhoneInput
                    id="phoneNumber"
                    placeholder="Enter phone number"
                    value={phoneNumber}
                    onChange={(value) => setPhoneNumber(value || "")}
                    defaultCountry={getCountryCode(detectedLocation || userLocation || "") as any}
                    international
                    className="phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required={!user}
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a password to secure your account (minimum 6 characters)
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Profile Information</h3>
              <div className="space-y-2">
                <Label htmlFor="artistName">Artist Name *</Label>
                <Input
                  id="artistName"
                  value={formData.artistName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, artistName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Act *</Label>
                <Select
                  value={formData.act}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, act: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your act" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-background">
                    {ACTS.map((act) => (
                      <SelectItem key={act.value} value={act.value}>
                        {act.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-background">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-sm sm:text-base font-semibold">Music Genres * (Select all that apply)</Label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {MUSIC_GENRES.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      className={`genre-bubble ${formData.musicGenres.includes(genre) ? "selected" : ""}`}
                      onClick={() => handleGenreChange(genre, !formData.musicGenres.includes(genre))}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <Label htmlFor="customGenre" className="text-sm font-medium">
                    Custom Genre
                  </Label>
                  <Input
                    id="customGenre"
                    placeholder="Enter your own style"
                    value={formData.customGenre}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customGenre: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Profile Picture *</Label>
                <SimpleAvatarUpload
                  currentImage={profileImageUrl}
                  onImageChange={() => {}}
                  onFileChange={handleAvatarFileChange}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Required - upload a professional photo</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="biography">Biography *</Label>
                <Textarea
                  id="biography"
                  placeholder="Tell us about yourself..."
                  value={formData.biography}
                  onChange={(e) => setFormData((prev) => ({ ...prev, biography: e.target.value }))}
                  required
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Age Range *</Label>
                  <Select
                    value={formData.age}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, age: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your age range" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-background">
                      <SelectItem value="20-30">20-30</SelectItem>
                      <SelectItem value="30-40">30-40</SelectItem>
                      <SelectItem value="40-50">40-50</SelectItem>
                      <SelectItem value="50-60">50-60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nationality *</Label>
                  <Select
                    value={formData.countryOfResidence}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, countryOfResidence: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your nationality" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 z-[100] bg-background">
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate per Hour *</Label>
                  <Input
                    id="rate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="100.00"
                    value={formData.ratePerHour}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ratePerHour: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] z-[100] bg-background">
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Talent Location *</Label>
                <div className="flex justify-start">
                  <LocationSelector 
                    onLocationChange={(location) => {
                      console.log('[TalentOnboarding] Location changed:', location);
                      setFormData(prev => ({ ...prev, location }));
                    }} 
                  />
                </div>
                <div className="mt-2">
                  {selectedLocation ? (
                    <p className="text-xs text-muted-foreground">
                      📍 Selected location: <strong>{selectedLocation}</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">
                      ⚠️ Please select or detect your location to continue
                    </p>
                  )}
                </div>
              </div>
            </div>
            {getValidationErrors().length > 0 && (
              <Alert variant="destructive" className="mt-3 sm:mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Please complete the following required fields:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {getValidationErrors().map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full mt-3 sm:mt-4 h-11 sm:h-10 text-sm sm:text-base" disabled={loading || getValidationErrors().length > 0}>
              {loading
                ? user
                  ? "Saving Profile..."
                  : "Welcome! 🎉"
                : user
                  ? "Complete Profile"
                  : "Sign Up with Email"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
