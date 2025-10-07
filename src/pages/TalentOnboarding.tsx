import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { debounce } from "lodash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Music, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { countries, sortCountriesByProximity } from "@/lib/countries";
import { SimpleGalleryUpload } from "@/components/SimpleGalleryUpload";
import { SimpleAvatarUpload } from "@/components/SimpleAvatarUpload";
import { ProFeatureWrapper } from "@/components/ProFeatureWrapper";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { useLocationDetection } from "@/hooks/useLocationDetection";
import { LocationSelector } from "@/components/LocationSelector";
import { useAuth } from "@/hooks/useAuth";

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
  { value: "saxophonist", label: "Saxophonist" },
  { value: "percussionist", label: "Percussionist" },
  { value: "singer", label: "Singer" },
  { value: "keyboardist", label: "Keyboardist" },
  { value: "drummer", label: "Drummer" },
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
  const { user, loading: authLoading, onboardingComplete, onboardingDraft } = useAuth();
  const { userLocation, detectedLocation } = useLocationDetection();
  const [loading, setLoading] = useState(false);
  const [pageInitialized, setPageInitialized] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [showProDialog, setShowProDialog] = useState(false);
  const [signupMessageVisible, setSignupMessageVisible] = useState(false);

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

  useEffect(() => {
    if (user && onboardingDraft && !draftLoaded) {
      console.log("[TalentOnboarding] Loading draft from Supabase:", onboardingDraft);
      setFormData((prev) => ({ ...prev, ...onboardingDraft }));
      if (onboardingDraft.profileImageUrl) setProfileImageUrl(onboardingDraft.profileImageUrl);
      setDraftLoaded(true);
    } else if (!user && !draftLoaded) {
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
  }, [user, onboardingDraft, draftLoaded]);

  useEffect(() => {
    if (!authLoading && user && onboardingComplete) {
      navigate("/talent-dashboard", { replace: true });
    }
  }, [authLoading, user, onboardingComplete, navigate]);

  useEffect(() => {
    if (!authLoading) setPageInitialized(true);
  }, [authLoading]);

  const uploadPicture = async (userId: string): Promise<string | null> => {
    if (!pictureFile) return profileImageUrl; // Return existing if no new file
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
      // Logic for an already logged-in user completing their profile
      if (user) {
        const pictureUrl = await uploadPicture(user.id);
        if (!pictureUrl && pictureFile) {
          // Fail only if a *new* upload fails
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

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ onboarding_complete: true, onboarding_draft: null, role: "talent" })
          .eq("id", user.id);
        if (profileUpdateError) throw profileUpdateError;

        toast({ title: "Success! 🎉", description: "Your talent profile is now live!" });
        localStorage.removeItem("talent_onboarding_draft");
        setTimeout(() => (window.location.href = "/talent-dashboard"), 1500);
        return;
      }

      // Logic for a brand new user signing up
      if (!email || !password || !fullName) {
        toast({
          variant: "destructive",
          title: "Missing information",
          description: "Please provide your email, password, and full name.",
        });
        setLoading(false);
        return;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Corrected the path to redirect to the dashboard
          emailRedirectTo: `${window.location.origin}/talent-dashboard`,
          data: { name: fullName, user_type: "talent", phone: phoneNumber },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Signup failed, user not created.");

      let draftData: any = { ...formData, email, fullName, phoneNumber };

      // Convert image to base64 to store in draft, as we can't upload yet
      if (pictureFile) {
        const reader = new FileReader();
        reader.readAsDataURL(pictureFile);
        reader.onloadend = async () => {
          draftData.profileImageUrl = reader.result as string;
          await supabase.from("profiles").update({ onboarding_draft: draftData }).eq("id", authData.user!.id);
        };
      } else {
        await supabase.from("profiles").update({ onboarding_draft: draftData }).eq("id", authData.user.id);
      }

      setSignupMessageVisible(true);
      toast({ title: "Account Created!", description: "Please check your email to verify your account." });
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

  const handleAvatarFileChange = (file: File | null) => {
    setPictureFile(file);
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setProfileImageUrl(reader.result as string);
      };
    } else {
      setProfileImageUrl(null);
    }
  };

  const selectedLocation = formData.location || userLocation || detectedLocation;

  const getValidationErrors = () => {
    const errors: string[] = [];
    if (!user) {
      if (!email) errors.push("Email address");
      if (!password) errors.push("Password (min 6 characters)");
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

  if (authLoading || !pageInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (signupMessageVisible) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Thank You for Signing Up!</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Please Check Your Email</AlertTitle>
              <AlertDescription>
                We've sent a verification link to **{email}**. Please click the link to confirm your account and
                complete your profile.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
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
                <Music className="h-6 w-6" /> Complete Your Talent Profile
              </CardTitle>
              <p className="text-muted-foreground mt-2">Tell us about yourself to get started as a talent</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!user && (
              <div className="space-y-4 pb-6 border-b border-border">
                <h3 className="text-lg font-semibold">Account Information</h3>
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
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password (min 6 characters)"
                    required={!user}
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
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
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    autoComplete="tel"
                  />
                </div>
              </div>
            )}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Profile Information</h3>
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
                  <SelectContent>
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
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <Label className="text-base font-semibold">Music Genres * (Select all that apply)</Label>
                <div className="flex flex-wrap gap-3">
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
                  onImageChange={setProfileImageUrl}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age Range *</Label>
                  <Select
                    value={formData.age}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, age: value }))}
                  >
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
                  <Select
                    value={formData.countryOfResidence}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, countryOfResidence: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your nationality" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                    <SelectContent className="max-h-[200px]">
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
                  <LocationSelector />
                </div>
                <p className="text-xs text-muted-foreground">Selected location: {selectedLocation || "Not selected"}</p>
              </div>
            </div>
            {getValidationErrors().length > 0 && (
              <Alert variant="destructive" className="mt-4">
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
            <Button type="submit" className="w-full mt-4" disabled={loading || getValidationErrors().length > 0}>
              {loading
                ? user
                  ? "Saving Profile..."
                  : "Creating Account..."
                : user
                  ? "Complete Profile"
                  : "Sign Up & Create Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
