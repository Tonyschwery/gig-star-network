import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
// import { supabase } from '@/integrations/supabase/client'; // Mocked below
import { debounce } from "lodash";
// --- Mock UI Components to resolve import errors ---
const Button = ({ children, ...props }) => <button {...props}>{children}</button>;
const Input = (props) => <input {...props} />;
const Label = ({ children, ...props }) => <label {...props}>{children}</label>;
const Textarea = (props) => <textarea {...props} />;
const Select = ({ children }) => <div>{children}</div>;
const SelectContent = ({ children }) => <div>{children}</div>;
const SelectItem = ({ children, ...props }) => <div {...props}>{children}</div>;
const SelectTrigger = ({ children }) => <div>{children}</div>;
const SelectValue = ({ placeholder }) => <span>{placeholder}</span>;
const Checkbox = (props) => <input type="checkbox" {...props} />;
const Card = ({ children, ...props }) => <div {...props}>{children}</div>;
const CardContent = ({ children, ...props }) => <div {...props}>{children}</div>;
const CardHeader = ({ children, ...props }) => <div {...props}>{children}</div>;
const CardTitle = ({ children, ...props }) => <h2 {...props}>{children}</h2>;
const Alert = ({ children, ...props }) => (
  <div role="alert" {...props}>
    {children}
  </div>
);
const AlertDescription = ({ children, ...props }) => <p {...props}>{children}</p>;
const AlertTitle = ({ children, ...props }) => <h5 {...props}>{children}</h5>;
const Music = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
    />
  </svg>
);
const AlertCircle = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// --- Mock Implementations for external modules/hooks ---
const supabase = {
  auth: {
    signUp: async () => ({ data: { user: { id: "123" }, session: "mock_session" }, error: null }),
    setSession: async () => ({}),
  },
  storage: {
    from: () => ({
      upload: async () => ({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "https://placehold.co/150x150" } }),
    }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {}, error: null }) }) }),
    update: () => ({ eq: () => ({ error: null }) }),
    upsert: () => ({ select: () => ({ single: async () => ({ data: { id: "456" }, error: null }) }) }),
  }),
  rpc: async () => ({ error: null }),
};

const useToast = () => ({ toast: (options) => console.log("Toast:", options.title, options.description) });
const countries = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
];
const sortCountriesByProximity = (loc, c) => c;
const SimpleGalleryUpload = () => <div>Simple Gallery Upload Placeholder</div>;
const SimpleAvatarUpload = ({ onFileChange }) => (
  <input type="file" onChange={(e) => onFileChange(e.target.files ? e.target.files[0] : null)} />
);
const ProFeatureWrapper = ({ children }) => <div>{children}</div>;
const SubscriptionModal = () => null;
const useEmailNotifications = () => ({ sendTalentProfileEmails: () => {} });
const useLocationDetection = () => ({
  userLocation: "New York, USA",
  detectedLocation: "New York, USA",
  saveLocation: () => {},
});
const LocationSelector = () => <div>Location Selector Placeholder</div>;
const useAuth = () => ({
  user: null, // Change to mock user object for testing logged-in state
  loading: false,
  onboardingComplete: false,
  onboardingDraft: null,
  refreshProfile: () => {},
});

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
];

export default function TalentOnboarding() {
  const navigate = useNavigate ? useNavigate() : () => {};
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
      setFormData((prev) => ({ ...prev, ...onboardingDraft }));
      setDraftLoaded(true);
    } else if (!user && !draftLoaded) {
      const localDraft = localStorage.getItem("talent_onboarding_draft");
      if (localDraft) {
        try {
          const draft = JSON.parse(localDraft);
          setFormData((prev) => ({ ...prev, ...draft }));
        } catch (error) {
          console.error("[TalentOnboarding] Error loading localStorage draft:", error);
        }
      }
      setDraftLoaded(true);
    }
  }, [user, onboardingDraft, draftLoaded]);

  useEffect(() => {
    if (!authLoading && user && onboardingComplete && navigate) {
      navigate("/talent-dashboard", { replace: true });
    }
  }, [authLoading, user, onboardingComplete, navigate]);

  useEffect(() => {
    if (!authLoading) {
      setPageInitialized(true);
    }
  }, [authLoading]);

  const saveDraftToSupabase = useCallback(
    debounce(async (draftData: any) => {
      setIsSavingDraft(true);
      if (user) {
        await supabase.from("profiles").update({ onboarding_draft: draftData }).eq("id", user.id);
      } else {
        localStorage.setItem("talent_onboarding_draft", JSON.stringify(draftData));
      }
      setIsSavingDraft(false);
    }, 1500),
    [user],
  );

  useEffect(() => {
    if (!draftLoaded) return;
    const draftData = { email, fullName, phoneNumber, ...formData, galleryImages, profileImageUrl };
    saveDraftToSupabase(draftData);
  }, [email, fullName, phoneNumber, formData, galleryImages, profileImageUrl, draftLoaded, saveDraftToSupabase]);

  useEffect(() => {
    const currentLocation = userLocation || detectedLocation;
    if (currentLocation && currentLocation !== "Worldwide" && !formData.location) {
      setFormData((prev) => ({ ...prev, location: currentLocation }));
    }
  }, [userLocation, detectedLocation, formData.location]);

  const handleGenreChange = (genre: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      musicGenres: checked ? [...prev.musicGenres, genre] : prev.musicGenres.filter((g) => g !== genre),
    }));
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

      if (!currentUser) {
        if (!email || !password || !fullName) {
          toast({
            variant: "destructive",
            title: "Missing information",
            description: "Please provide email, password, and full name.",
          });
          setLoading(false);
          return;
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: fullName, user_type: "talent", phone: phoneNumber } },
        });

        if (signUpError || !authData.user || !authData.session) {
          toast({
            variant: "destructive",
            title: "Sign up failed",
            description: signUpError?.message || "Unable to create account.",
          });
          setLoading(false);
          return;
        }

        await supabase.auth.setSession(authData.session);
        currentUser = authData.user;

        await supabase.rpc("ensure_profile", { p_user_id: currentUser.id, p_email: email, p_role: "talent" });
      }

      let pictureUrl = profileImageUrl;
      if (pictureFile) {
        pictureUrl = await uploadPicture(currentUser.id);
        if (!pictureUrl) {
          toast({ title: "Upload failed", description: "Failed to upload profile picture", variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      const allGenres = [...formData.musicGenres];
      if (formData.customGenre.trim()) allGenres.push(formData.customGenre.trim());

      const profileData = {
        user_id: currentUser.id,
        artist_name: formData.artistName,
        act: formData.act as any,
        gender: formData.gender as any,
        music_genres: allGenres,
        picture_url: pictureUrl,
        biography: formData.biography,
        age: formData.age,
        nationality: formData.countryOfResidence,
        rate_per_hour: parseFloat(formData.ratePerHour),
        currency: formData.currency,
        location: formData.location || userLocation || detectedLocation || "",
      };

      const { error } = await supabase.from("talent_profiles").upsert(profileData).select("id").single();

      if (error) {
        toast({ title: "Profile creation failed", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      await supabase
        .from("profiles")
        .update({ onboarding_complete: true, onboarding_draft: null, role: "talent" })
        .eq("id", currentUser.id);

      localStorage.removeItem("talent_onboarding_draft");
      toast({ title: "Success! 🎉", description: "Your talent profile is now live!" });

      await new Promise((resolve) => setTimeout(resolve, 1500));
      window.location.href = "/talent-dashboard";
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
    if (!pictureFile && !profileImageUrl) errors.push("Profile picture");
    if (!formData.biography) errors.push("Biography");
    return errors;
  };

  if (authLoading || !pageInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Music className="h-6 w-6" /> Complete Your Talent Profile
          </CardTitle>
          <p className="text-gray-500 mt-2">Tell us about yourself to get started</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!user && (
              <div className="space-y-4 pb-6 border-b">
                <h3 className="text-lg font-semibold">Account Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
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
              <div className="space-y-2">
                <Label>Profile Picture *</Label>
                <SimpleAvatarUpload onFileChange={handleAvatarFileChange} />
              </div>
              <div className="space-y-2">
                <Label>Biography *</Label>
                <Textarea
                  id="biography"
                  value={formData.biography}
                  onChange={(e) => setFormData((prev) => ({ ...prev, biography: e.target.value }))}
                  required
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
                      <SelectValue placeholder="Select age range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20-30">20-30</SelectItem>
                      <SelectItem value="30-40">30-40</SelectItem>
                      <SelectItem value="40-50">40-50</SelectItem>
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
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent>
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
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {getValidationErrors().length > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Please complete all required fields:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {getValidationErrors().map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full mt-4" disabled={loading || getValidationErrors().length > 0}>
              {loading ? "Processing..." : "Submit Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
