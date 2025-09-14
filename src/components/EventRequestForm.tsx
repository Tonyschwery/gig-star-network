// FILE: src/components/EventRequestForm.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";

export function EventRequestForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { sendEventRequestEmails } = useEmailNotifications();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [bookerName, setBookerName] = useState(user?.user_metadata?.name || "");
  const [bookerPhone, setBookerPhone] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [eventDuration, setEventDuration] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  const [talentTypeNeeded, setTalentTypeNeeded] = useState("");

  const eventTypes = ["wedding", "birthday", "corporate", "opening", "club", "school", "festival", "private party", "other"];
  const talentTypes = ["Singer", "Guitarist", "Pianist", "DJ", "Band", "Violinist", "Saxophonist", "Drummer", "Other"];

  // --- NEW: Function to handle automatic location detection ---
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }
    
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // NOTE: This gives you coordinates. You need a reverse geocoding service
        // to turn these into a city/country name like "Doha, Qatar".
        // For now, we'll store the raw coordinates as a placeholder.
        const locationString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setEventLocation(locationString); 
        toast({ title: "Location Detected!" });
        setIsDetectingLocation(false);
      },
      () => {
        toast({ title: "Unable to retrieve your location.", description: "Please grant location permission or enter it manually.", variant: "destructive" });
        setIsDetectingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) {
      toast({ title: "Authentication Required", variant: "destructive" });
      navigate('/login');
      return;
    }
    if (!bookerName || !eventDate || !eventLocation || !eventType || !eventDuration) {
      toast({ title: "Missing Information", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('event_requests')
        .insert({
          user_id: user.id,
          booker_email: user.email, // <-- CRITICAL FIX: Add the booker's email
          booker_name: bookerName,
          booker_phone: bookerPhone,
          event_date: format(eventDate, 'yyyy-MM-dd'),
          event_duration: parseInt(eventDuration, 10),
          event_location: eventLocation, // This will be the detected coordinates for now
          event_type: eventType,
          description: description,
          talent_type_needed: talentTypeNeeded,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await sendEventRequestEmails({
            bookerEmail: user.email,
            bookerName: bookerName,
            eventDate: format(eventDate, 'PPP'),
            eventType: eventType
        });
      }
      toast({ title: "Request Submitted!" });
      navigate('/booker-dashboard');

    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-8 border rounded-lg bg-card text-card-foreground shadow-md">
      {/* ... Form fields for name, phone, event type, date ... */}
       <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="booker-name">Your Name *</Label>
                <Input id="booker-name" placeholder="Enter your full name" value={bookerName} onChange={(e) => setBookerName(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="booker-phone">Phone Number</Label>
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
                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus /></PopoverContent>
                </Popover>
            </div>
       </div>

        <div className="space-y-2">
            <Label htmlFor="event-location">Event Location *</Label>
            <div className="flex items-center gap-2">
                <Input id="event-location" placeholder="Click detect or enter manually" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} required />
                <Button type="button" variant="outline" onClick={handleDetectLocation} disabled={isDetectingLocation}>
                    <MapPin className="h-4 w-4 mr-2" />
                    {isDetectingLocation ? 'Detecting...' : 'Detect'}
                </Button>
            </div>
        </div>
        
        {/* ... Rest of the form fields ... */}
         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="event-duration">Event Duration (hours) *</Label>
                <Input id="event-duration" type="number" placeholder="e.g., 3" value={eventDuration} onChange={(e) => setEventDuration(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="talent-needed">Talent Type Needed</Label>
                <Select onValueChange={setTalentTypeNeeded}>
                    <SelectTrigger><SelectValue placeholder="What kind of talent?" /></SelectTrigger>
                    <SelectContent>{talentTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                </Select>
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="description">Event Description</Label>
            <Textarea id="description" placeholder="Tell us more about your event..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="pt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Submitting..." : "Send Event Request"}
            </Button>
        </div>
    </form>
  );
}