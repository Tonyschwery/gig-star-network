import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
// import { supabase } from '@/integrations/supabase/client'; // This will be mocked
import { debounce } from "lodash";

// --- Mock Implementations for Missing Imports ---

// Mock UI components from '@/components/ui/*'
const Button = ({ children, className, ...props }) => (
  <button className={className} {...props}>
    {children}
  </button>
);
const Input = (props) => <input {...props} />;
const Label = ({ children, ...props }) => <label {...props}>{children}</label>;
const Textarea = (props) => <textarea {...props} />;
const Select = ({ children, ...props }) => <div {...props}>{children}</div>;
const SelectContent = ({ children, ...props }) => <div {...props}>{children}</div>;
const SelectItem = ({ children, ...props }) => <div {...props}>{children}</div>;
const SelectTrigger = ({ children, ...props }) => <div {...props}>{children}</div>;
const SelectValue = ({ placeholder, ...props }) => <span {...props}>{placeholder}</span>;
const Checkbox = (props) => <input type="checkbox" {...props} />;
const Card = ({ children, className, ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
);
const CardContent = ({ children, ...props }) => <div {...props}>{children}</div>;
const CardHeader = ({ children, className, ...props }) => (
  <header className={className} {...props}>
    {children}
  </header>
);
const CardTitle = ({ children, className, ...props }) => (
  <h2 className={className} {...props}>
    {children}
  </h2>
);
const Alert = ({ children, ...props }) => (
  <div role="alert" {...props}>
    {children}
  </div>
);
const AlertDescription = ({ children, ...props }) => <p {...props}>{children}</p>;
const AlertTitle = ({ children, ...props }) => <h3 {...props}>{children}</h3>;

// Mock icons from 'lucide-react'
const Music = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);
const AlertCircle = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// Mock other components and libraries
const SimpleGalleryUpload = (props) => <div {...props}>Gallery Upload Component</div>;
const SimpleAvatarUpload = (props) => <div {...props}>Avatar Upload Component</div>;
const ProFeatureWrapper = ({ children }) => <>{children}</>;
const SubscriptionModal = (props) => (props.open ? <div>Subscription Modal</div> : null);
const LocationSelector = () => <div>Location Selector Component</div>;
const countries = [
  { name: "United States", code: "US" },
  { name: "United Kingdom", code: "GB" },
];
const sortCountriesByProximity = (loc, c) => c;

// Mock Supabase client
const supabase = {
  auth: {
    signUp: async () => ({ data: { user: { id: "mock_user_id" }, session: "mock_session" }, error: null }),
    setSession: async () => ({}),
  },
  storage: {
    from: () => ({
      upload: async () => ({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "https://placehold.co/150" } }),
    }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: async () => ({ error: null }) }),
    upsert: () => ({ select: () => ({ single: async () => ({ data: { id: "mock_profile_id" }, error: null }) }) }),
  }),
  rpc: async () => ({ error: null }),
};

// Mock custom hooks
const useToast = () => ({ toast: (options) => console.log("Toast:", options) });
const useEmailNotifications = () => ({ sendTalentProfileEmails: async () => {} });
const useLocationDetection = () => ({ userLocation: null, detectedLocation: null, saveLocation: () => {} });
const useAuth = () => ({
  user: null, // Set to a mock user object to test logged-in state
  loading: false,
  onboardingComplete: false,
  onboardingDraft: null,
  refreshProfile: async () => {},
});
// --- End Mock Implementations ---

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

  // Auth fields for new users
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

  // Load draft data from Supabase or localStorage
  useEffect(() => {
    if (user && onboardingDraft && !draftLoaded) {
      console.log("[TalentOnboarding] Loading draft from Supabase:", onboardingDraft);

      if (onboardingDraft.email) setEmail(onboardingDraft.email);
      if (onboardingDraft.fullName) setFullName(onboardingDraft.fullName);
      if (onboardingDraft.phoneNumber) setPhoneNumber(onboardingDraft.phoneNumber);

      setFormData((prev) => ({
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
    } else if (!user && !draftLoaded) {
      // Load from localStorage for non-authenticated users
      const localDraft = localStorage.getItem("talent_onboarding_draft");
      if (localDraft) {
        try {
          const draft = JSON.parse(localDraft);
          console.log("[TalentOnboarding] Loading draft from localStorage:", draft);

          if (draft.email) setEmail(draft.email);
          if (draft.fullName) setFullName(draft.fullName);
          if (draft.phoneNumber) setPhoneNumber(draft.phoneNumber);

          setFormData((prev) => ({
            ...prev,
            artistName: draft.artistName || prev.artistName,
            act: draft.act || prev.act,
            gender: draft.gender || prev.gender,
            musicGenres: draft.musicGenres || prev.musicGenres,
            customGenre: draft.customGenre || prev.customGenre,
            soundcloudLink: draft.soundcloudLink || prev.soundcloudLink,
            youtubeLink: draft.youtubeLink || prev.youtubeLink,
            biography: draft.biography || prev.biography,
            age: draft.age || prev.age,
            countryOfResidence: draft.countryOfResidence || prev.countryOfResidence,
            ratePerHour: draft.ratePerHour || prev.ratePerHour,
            currency: draft.currency || prev.currency,
            location: draft.location || prev.location,
          }));
        } catch (error) {
          console.error("[TalentOnboarding] Error loading localStorage draft:", error);
        }
      }
      setDraftLoaded(true);
    }
  }, [user, onboardingDraft, draftLoaded]);

  // Redirect if already completed onboarding (only for logged-in users)
  useEffect(() => {
    if (!authLoading && user && onboardingComplete) {
      console.log("[TalentOnboarding] Onboarding already complete, redirecting to dashboard");
      navigate("/talent-dashboard", { replace: true });
    }
  }, [authLoading, user, onboardingComplete, navigate]);

  // Initialize page
  useEffect(() => {
    if (!authLoading) {
      setPageInitialized(true);
    }
  }, [authLoading]);

  // Debounced autosave function
  const saveDraftToSupabase = useCallback(
    debounce(async (draftData: any) => {
      setIsSavingDraft(true);
      console.log("[TalentOnboarding] Autosaving draft");

      if (user) {
        // Save to Supabase for logged-in users
        const { error } = await supabase.from("profiles").update({ onboarding_draft: draftData }).eq("id", user.id);

        if (error) {
          console.error("[TalentOnboarding] Error saving draft:", error);
        } else {
          console.log("[TalentOnboarding] Draft saved to Supabase");
        }
      } else {
        // Save to localStorage for non-logged-in users
        localStorage.setItem("talent_onboarding_draft", JSON.stringify(draftData));
        console.log("[TalentOnboarding] Draft saved to localStorage");
      }

      setIsSavingDraft(false);
    }, 1500),
    [user],
  );

  // Auto-save draft whenever form data changes
  useEffect(() => {
    if (!draftLoaded) return;

    const draftData = {
      email,
      fullName,
      phoneNumber,
      ...formData,
      galleryImages,
      profileImageUrl,
    };

    saveDraftToSupabase(draftData);
  }, [email, fullName, phoneNumber, formData, galleryImages, profileImageUrl, draftLoaded, saveDraftToSupabase]);

  // Update form location when user location changes
  useEffect(() => {
    const currentLocation = userLocation || detectedLocation;
    if (currentLocation && currentLocation !== "Worldwide" && !formData.location) {
      setFormData((prev) => ({ ...prev, location: currentLocation }));
    }
  }, [userLocation, detectedLocation, formData.location]);

  const handleLocationChange = (location: string) => {
    setFormData((prev) => ({ ...prev, location }));
  };

  const handleGenreChange = (genre: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        musicGenres: [...prev.musicGenres, genre],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        musicGenres: prev.musicGenres.filter((g) => g !== genre),
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

    const fileExt = pictureFile.name.split(".").pop();
    const fileName = `${userId}/profile.${fileExt}`;

    const { error } = await supabase.storage.from("talent-pictures").upload(fileName, pictureFile, { upsert: true });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data } = supabase.storage.from("talent-pictures").getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let currentUser = user;

      // If user is not logged in, sign them up first
      if (!currentUser) {
        console.log("[TalentOnboarding] User not authenticated, signing up...");

        // Validate required auth fields
        if (!email || !password || !fullName) {
          toast({
            variant: "destructive",
            title: "Missing information",
            description: "Please provide your email, password, and full name.",
          });
          setLoading(false);
          return;
        }

        // Sign up the user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/talent-dashboard`,
            data: {
              name: fullName,
              user_type: "talent",
              phone: phoneNumber,
            },
          },
        });

        if (signUpError) {
          toast({
            variant: "destructive",
            title: "Sign up failed",
            description: signUpError.message,
          });
          setLoading(false);
          return;
        }

        if (!authData.user || !authData.session) {
          toast({
            variant: "destructive",
            title: "Sign up failed",
            description: "Unable to create account. Please try again.",
          });
          setLoading(false);
          return;
        }

        // --- FIX FOR PICTURE UPLOAD ON SIGNUP ---
        // Manually set the session to ensure the user is authenticated
        // for the following steps, like picture upload.
        await supabase.auth.setSession(authData.session);
        // --- END FIX ---

        currentUser = authData.user;
        console.log("[TalentOnboarding] User signed up successfully:", currentUser.id);

        // Wait and verify profile was created by trigger (with retries)
        let profileExists = false;
        const maxRetries = 3;
        const delays = [500, 1000, 2000];

        for (let i = 0; i < maxRetries; i++) {
          await new Promise((resolve) => setTimeout(resolve, delays[i]));

          const { data: profile } = await supabase.from("profiles").select("id").eq("id", currentUser.id).maybeSingle();

          if (profile) {
            profileExists = true;
            console.log("[TalentOnboarding] Profile found on retry", i + 1);
            break;
          }
        }

        // If profile still doesn't exist, use ensure_profile function
        if (!profileExists) {
          console.log("[TalentOnboarding] Profile not found after retries, calling ensure_profile");
          const { error: ensureError } = await supabase.rpc("ensure_profile", {
            p_user_id: currentUser.id,
            p_email: email,
            p_role: "talent",
          });

          if (ensureError) {
            console.error("[TalentOnboarding] ensure_profile error:", ensureError);
            toast({
              title: "Profile Creation Failed",
              description: "Could not create user profile. Please contact support.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }
      }

      // Check if user is Pro subscriber (for Pro features)
      const { data: existingProfile } = await supabase
        .from("talent_profiles")
        .select("is_pro_subscriber")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      const isProUser = existingProfile?.is_pro_subscriber || false;

      // Upload picture if provided
      let pictureUrl = null;
      if (pictureFile) {
        pictureUrl = await uploadPicture(currentUser.id);
        if (!pictureUrl) {
          toast({
            title: "Upload failed",
            description: "Failed to upload profile picture",
            variant: "destructive",
          });
          setLoading(false);
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
        user_id: currentUser.id,
        artist_name: formData.artistName,
        act: formData.act as any,
        gender: formData.gender as any,
        music_genres: allGenres,
        custom_genre: formData.customGenre || null,
        picture_url: pictureUrl,
        // Only save Pro features if user is Pro
        gallery_images: isProUser ? galleryImages : [],
        soundcloud_link: isProUser ? formData.soundcloudLink || null : null,
        youtube_link: isProUser ? formData.youtubeLink || null : null,
        biography: formData.biography,
        age: formData.age, // Now stores age range as string
        nationality: formData.countryOfResidence,
        rate_per_hour: parseFloat(formData.ratePerHour),
        currency: formData.currency,
        location: formData.location || userLocation || detectedLocation || "",
      };

      const { data: talentProfile, error } = await supabase
        .from("talent_profiles")
        .upsert(profileData)
        .select("id")
        .single();

      if (error) {
        console.error("[TalentOnboarding] Error creating talent profile:", error);
        toast({
          title: "Profile creation failed",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log("[TalentOnboarding] ✅ Talent profile created successfully");

      // Save location preference to user_preferences
      const locationToSave = formData.location || userLocation || detectedLocation;
      if (locationToSave) {
        const { error: locationError } = await supabase.from("user_preferences").upsert({
          user_id: currentUser.id,
          preferred_location: locationToSave,
          detected_location: detectedLocation || null,
          location_override: !!formData.location,
        });

        if (locationError) {
          console.warn("[TalentOnboarding] Error saving location preference:", locationError);
        } else {
          console.log("[TalentOnboarding] ✅ Location preference saved");
        }
      }

      // CRITICAL: Mark onboarding as complete in profiles table
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          onboarding_complete: true,
          onboarding_draft: null,
          role: "talent",
        })
        .eq("id", currentUser.id);

      if (profileUpdateError) {
        console.error("[TalentOnboarding] CRITICAL - Error updating onboarding status:", profileUpdateError);
        toast({
          title: "Error",
          description: "Failed to complete onboarding. Please try again or contact support.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log("[TalentOnboarding] ✅ Onboarding complete, profile saved");

      // Clear localStorage draft
      localStorage.removeItem("talent_onboarding_draft");

      // Show success message
      toast({
        title: "Success! 🎉",
        description: "Your talent profile is now live! Redirecting to your dashboard...",
      });

      // Wait a moment for the user to see the success message
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Force a full page reload to talent dashboard
      // This ensures auth state is completely re-initialized with the new onboarding_complete flag
      window.location.href = "/talent-dashboard";
    } catch (error: any) {
      console.error("[TalentOnboarding] Error creating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
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

  // Validation function to check all required fields
  const getValidationErrors = () => {
    const errors: string[] = [];

    // Auth fields (only for non-logged-in users)
    if (!user) {
      if (!email) errors.push("Email address");
      if (!password) errors.push("Password (min 6 characters)");
      if (!fullName) errors.push("Full name");
    }

    // Profile fields (required for all)
    if (!formData.artistName) errors.push("Artist name");
    if (!formData.act) errors.push("Act type");
    if (!formData.gender) errors.push("Gender");
    if (formData.musicGenres.length === 0) errors.push("At least one music genre");
    if (!formData.age) errors.push("Age range");
    if (!formData.countryOfResidence) errors.push("Country of residence");
    if (!formData.ratePerHour) errors.push("Rate per hour");
    if (!selectedLocation) errors.push("Location");
    if (!pictureFile && !profileImageUrl) errors.push("Profile picture");
    if (!formData.biography || formData.biography.trim().length === 0) errors.push("Biography");

    return errors;
  };

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
              <p className="text-muted-foreground mt-2">Tell us about yourself to get started as a talent</p>
            </div>
            {isSavingDraft && (
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">Saving draft...</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Auth Fields (only show if user is not logged in) */}
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

            {/* Profile Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Profile Information</h3>

              {/* Artist Name */}
              <div className="space-y-2">
                <Label htmlFor="artistName">Artist Name *</Label>
                <Input
                  id="artistName"
                  value={formData.artistName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, artistName: e.target.value }))}
                  required
                />
              </div>

              {/* Act */}
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

              {/* Gender */}
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

              {/* Music Genres */}
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

              {/* Picture Upload */}
              <div className="space-y-2">
                <Label>Profile Picture *</Label>
                <SimpleAvatarUpload
                  currentImage={profileImageUrl}
                  onImageChange={handleAvatarImageChange}
                  onFileChange={handleAvatarFileChange}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Required - upload a professional photo</p>
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, soundcloudLink: e.target.value }))}
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, youtubeLink: e.target.value }))}
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, biography: e.target.value }))}
                  required
                  rows={4}
                />
              </div>

              {/* Age and Nationality */}
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
                <p className="text-xs text-muted-foreground">Selected location: {selectedLocation || "Not selected"}</p>
              </div>
            </div>

            {/* Validation Errors Alert */}
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
                  ? "Creating Profile..."
                  : "Creating Account & Profile..."
                : user
                  ? "Complete Profile"
                  : "Sign Up & Complete Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pro Subscription CTA Dialog */}
      <SubscriptionModal open={showProDialog} onOpenChange={setShowProDialog} />
    </div>
  );
}
