import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Clock, MapPin, X, User, Mail, Lock, Settings, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { countries } from "@/lib/countries";

interface BookingFormProps {
  talentId: string;
  talentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingForm({ talentId, talentName, onClose, onSuccess }: BookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookerName, setBookerName] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [eventDuration, setEventDuration] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventAddress, setEventAddress] = useState("");
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  
  // Equipment fields
  const [needsEquipment, setNeedsEquipment] = useState(false);
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [customEquipment, setCustomEquipment] = useState("");
  
  
  // Auth fields for non-authenticated users
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  const eventTypes = [
    "wedding",
    "birthday", 
    "corporate",
    "opening",
    "club",
    "school",
    "festival"
  ];

  const equipmentOptions = [
    "DJ set",
    "speakers", 
    "monitor"
  ];

  const handleEquipmentToggle = (equipment: string) => {
    setEquipmentTypes(prev => 
      prev.includes(equipment) 
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    );
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please fill in email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsSigningUp(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account, then try booking again.",
      });

      // Don't close the form, just clear auth fields so user can try again after verification
      setEmail("");
      setPassword("");
    } catch (error: any) {
      console.error('Error signing up:', error);
      toast({
        title: "Sign Up Failed",
        description: error.message || "There was an error creating your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please fill in email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsSigningUp(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Signed In!",
        description: "You can now proceed with your booking.",
      });

      // Clear auth fields
      setEmail("");
      setPassword("");
    } catch (error: any) {
      console.error('Error signing in:', error);
      toast({
        title: "Sign In Failed",
        description: error.message || "There was an error signing in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign up or sign in first to book this talent.",
        variant: "destructive",
      });
      return;
    }

    // Prevent talents from booking themselves
    if (talentId !== "public-request") {
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('user_id')
        .eq('id', talentId)
        .maybeSingle();
      
      if (talentProfile?.user_id === user.id) {
        toast({
          title: "Cannot Book Yourself",
          description: "You cannot book yourself as a talent.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!bookerName || !eventDate || !eventDuration || !eventLocation || !eventAddress || !eventType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Prepare equipment data - handle PostgreSQL ARRAY type properly
    const allEquipmentTypes = [...equipmentTypes];
    if (customEquipment.trim()) {
      allEquipmentTypes.push(customEquipment.trim());
    }
    
    // Send null when no equipment needed to avoid PostgreSQL ARRAY parsing issues
    const equipmentTypesForDB = needsEquipment && allEquipmentTypes.length > 0 ? allEquipmentTypes : null;

    setIsSubmitting(true);

    try {
      const isPublicRequest = talentId === "public-request";
      
      console.log('Submitting booking with data:', {
        user_id: user.id,
        talent_id: isPublicRequest ? null : talentId,
        booker_name: bookerName,
        booker_email: user.email,
        event_date: format(eventDate, 'yyyy-MM-dd'),
        event_duration: parseInt(eventDuration),
        event_location: eventLocation,
        event_address: eventAddress,
        event_type: eventType,
        description: description || null,
        needs_equipment: needsEquipment,
        equipment_types: equipmentTypesForDB,
          custom_equipment: needsEquipment && customEquipment.trim() ? customEquipment.trim() : null,
        is_public_request: isPublicRequest,
        is_gig_opportunity: isPublicRequest,
      });
      
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          talent_id: isPublicRequest ? null : talentId,
          booker_name: bookerName,
          booker_email: user.email,
          event_date: format(eventDate, 'yyyy-MM-dd'),
          event_duration: parseInt(eventDuration),
          event_location: eventLocation,
          event_address: eventAddress,
          event_type: eventType,
          description: description || null,
          needs_equipment: needsEquipment,
          equipment_types: equipmentTypesForDB,
          custom_equipment: needsEquipment && customEquipment.trim() ? customEquipment.trim() : null,
          is_public_request: isPublicRequest,
          is_gig_opportunity: isPublicRequest,
        })
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Booking created successfully:', data);

      toast({
        title: isPublicRequest ? "Request Submitted!" : "Booking Request Sent!",
        description: isPublicRequest 
          ? "Your request has been submitted and will be visible to our pro talents who can help you."
          : `Your booking request for ${talentName} has been submitted successfully.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      
      // More specific error handling
      let errorMessage = "There was an error submitting your booking request. Please try again.";
      
      if (error.code === 'PGRST116') {
        errorMessage = "Database connection error. Please check your internet connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Booking Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl sm:text-2xl">Your Event</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Booking request for: <span className="font-medium text-primary">{talentName}</span>
          </div>

          {!user ? (
            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSignIn}
                    disabled={isSigningUp}
                    className="w-full hero-button"
                  >
                    {isSigningUp ? "Signing In..." : "Sign In"}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSignUp}
                    disabled={isSigningUp}
                    className="w-full hero-button"
                  >
                    {isSigningUp ? "Creating Account..." : "Create Account"}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    By creating an account, you agree to our terms and can book talented performers.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Booker Name */}
              <div className="space-y-2">
                <Label htmlFor="booker-name">Your Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="booker-name"
                    placeholder="Enter your full name"
                    value={bookerName}
                    onChange={(e) => setBookerName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

            {/* Date & Duration */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-date">Event Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !eventDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={setEventDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (hours) *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="duration"
                    type="number"
                    placeholder="e.g., 4"
                    value={eventDuration}
                    onChange={(e) => setEventDuration(e.target.value)}
                    className="pl-10"
                    min="1"
                    max="24"
                  />
                </div>
              </div>
            </div>

            {/* Location & Address */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">Event Country *</Label>
                <Select onValueChange={setEventLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Full Address *</Label>
                <Input
                  id="address"
                  placeholder="e.g., 123 Main Street, City, Country"
                  value={eventAddress}
                  onChange={(e) => setEventAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Event Type */}
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type *</Label>
              <Select onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Equipment Question */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="needs-equipment" 
                  checked={needsEquipment}
                  onCheckedChange={(checked) => setNeedsEquipment(checked as boolean)}
                />
                <Label htmlFor="needs-equipment" className="text-base font-medium flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Do you need equipment?
                </Label>
              </div>
              
              {needsEquipment && (
                <div className="space-y-3 ml-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Select equipment:</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {equipmentOptions.map((equipment) => (
                        <div key={equipment} className="flex items-center space-x-2">
                          <Checkbox
                            id={equipment}
                            checked={equipmentTypes.includes(equipment)}
                            onCheckedChange={() => handleEquipmentToggle(equipment)}
                          />
                          <Label htmlFor={equipment} className="text-sm">
                            {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="custom-equipment" className="text-sm font-medium">Other equipment needed:</Label>
                    <Input
                      id="custom-equipment"
                      placeholder="e.g., microphones, lighting, etc."
                      value={customEquipment}
                      onChange={(e) => setCustomEquipment(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Event Description</Label>
              <Textarea
                id="description"
                placeholder="Please mention your budget and any special requirements or extra details here. This information helps ensure a smooth workflow with the talent."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1 order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 hero-button order-1 sm:order-2"
                >
                  {isSubmitting ? "Submitting..." : "Send Booking Request"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}