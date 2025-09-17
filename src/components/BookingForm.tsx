// FILE: src/components/BookingForm.tsx

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
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";

interface BookingFormProps {
  talentId: string;
  talentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingForm({ talentId, talentName, onClose, onSuccess }: BookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendBookingEmails } = useEmailNotifications();
  
  // State for the main booking form
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookerName, setBookerName] = useState(user?.user_metadata?.name || "");
  const [bookerPhone, setBookerPhone] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [eventDuration, setEventDuration] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");

  // State for the embedded login/signup form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  const eventTypes = ["wedding", "birthday", "corporate", "opening", "club", "school", "festival", "private party", "other"];

  const handleSignIn = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Signed in successfully!", description: "You can now complete your booking." });
      // The useAuth hook will update the user state, and the component will re-render to show the booking form.
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: signupName, user_type: 'booker' } }
    });
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "Please check your email to verify, then you can complete your booking." });
    }
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be signed in to send a booking.", variant: "destructive" });
      return;
    }
    if (!bookerName || !eventDate || !eventLocation || !eventType || !eventDuration) {
        toast({ title: "Missing Information", description: "Please fill out all required fields.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      const bookingData = {
        user_id: user.id,
        talent_id: talentId,
        booker_name: bookerName,
        booker_email: user.email,
        booker_phone: bookerPhone,
        event_date: format(eventDate, 'yyyy-MM-dd'),
        event_duration: parseInt(eventDuration, 10),
        event_location: eventLocation,
        event_type: eventType,
        description: description,
        status: 'pending',
      };

      const { data, error } = await supabase.from('bookings').insert(bookingData).select().single();
      if (error) throw error;
      
      // Send notifications for the new direct booking
      await sendBookingEmails({ ...data, talent_name: talentName });

      onSuccess(); // Call the onSuccess prop from the parent
      onClose(); // Close the modal

    } catch (err: any) {
      toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <CardTitle className="text-xl sm:text-2xl">Book Talent</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="text-sm text-muted-foreground mb-6">
            Booking request for: <span className="font-medium text-primary">{talentName}</span>
          </div>
          
          {!user ? (
            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="space-y-4 pt-4">
                <p className="text-sm text-center text-muted-foreground">Sign in to your account to continue.</p>
                <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button onClick={handleSignIn} disabled={isSubmitting} className="w-full">{isSubmitting ? 'Signing In...' : 'Sign In'}</Button>
              </TabsContent>
              <TabsContent value="signup" className="space-y-4 pt-4">
                <p className="text-sm text-center text-muted-foreground">Create a new account to book this talent.</p>
                <div className="space-y-2">
                    <Label htmlFor="signup-name">Your Name</Label>
                    <Input id="signup-name" placeholder="Enter your full name" value={signupName} onChange={(e) => setSignupName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button onClick={handleSignUp} disabled={isSubmitting} className="w-full">{isSubmitting ? 'Creating Account...' : 'Sign Up & Continue'}</Button>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                      <Label htmlFor="booker-name">Your Name *</Label>
                      <Input id="booker-name" value={bookerName} onChange={(e) => setBookerName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="booker-phone">Your Phone Number</Label>
                      <Input id="booker-phone" type="tel" value={bookerPhone} onChange={(e) => setBookerPhone(e.target.value)} />
                  </div>
                   <div className="space-y-2">
                        <Label htmlFor="event-type">Event Type *</Label>
                        <Select onValueChange={setEventType} required>
                            <SelectTrigger><SelectValue placeholder="Select an event type" /></SelectTrigger>
                            <SelectContent>{eventTypes.map(type => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="event-date">Event Date *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="event-location">Event Location *</Label>
                        <Input id="event-location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="event-duration">Event Duration (hours) *</Label>
                        <Input id="event-duration" type="number" placeholder="e.g., 3" value={eventDuration} onChange={(e) => setEventDuration(e.target.value)} required />
                    </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Event Description</Label>
                <Textarea id="description" placeholder="Provide any extra details about your event..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:flex-1">{isSubmitting ? "Submitting..." : "Send Booking Request"}</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}