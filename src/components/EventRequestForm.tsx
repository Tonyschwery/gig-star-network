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

// --- NEW: Import the phone number input component and its CSS ---
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { CountryCode } from 'react-phone-number-input/types';

export function EventRequestForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [bookerName, setBookerName] = useState(user?.user_metadata?.name || "");
  const [bookerPhone, setBookerPhone] = useState<string | undefined>();
  const [eventDate, setEventDate] = useState<Date>();
  const [eventDuration, setEventDuration] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [detectedCountry, setDetectedCountry] = useState<CountryCode | undefined>(); // State for the country code
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  const [talentTypeNeeded, setTalentTypeNeeded] = useState("");

  const eventTypes = ["wedding", "birthday", "corporate", "opening", "club", "school", "festival", "private party", "other"];
  const talentTypes = ["Singer", "Guitarist", "Pianist", "DJ", "Band", "Violinist", "Saxophonist", "Drummer", "Other"];

  // --- UPDATED: This function now calls our new Edge Function ---
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }
    
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Call our new Supabase function
          const { data, error } = await supabase.functions.invoke('reverse-geocode', {
            body: { latitude, longitude },
          });

          if (error) throw new Error(error.message);

          setEventLocation(data.formatted_address);
          setDetectedCountry(data.country_code as CountryCode); // Sync the phone input with the detected country

          toast({ title: "Location Detected!", description: data.formatted_address });
        } catch (error: any) {
          toast({ title: "Could not fetch address", description: error.message, variant: "destructive" });
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        toast({ title: "Unable to retrieve your location.", description: "Please grant location permission or enter it manually.", variant: "destructive" });
        setIsDetectingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // ... (handleSubmit logic remains the same as the last correct version)
    e.preventDefault();
    if (!user || !user.email) {
      toast({ title: "Authentication Required", variant: "destructive" });
      navigate('/login');
      return;
    }
    // ... validation checks ...
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('event_requests').insert({ /* ... data ... */ });
      if (error) throw error;
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="booker-name">Your Name *</Label>
          <Input id="booker-name" value={bookerName} onChange={(e) => setBookerName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="booker-phone">Phone Number</Label>
          {/* --- NEW: Use the smart phone input component --- */}
          <PhoneInput
            id="booker-phone"
            placeholder="Enter phone number"
            value={bookerPhone}
            onChange={setBookerPhone}
            international
            defaultCountry={detectedCountry} // This syncs with the detected location!
            className="phone-input"
          />
        </div>
        {/* ... Other form fields like Event Type and Event Date ... */}
      </div>
      <div className="space-y-2">
        <Label htmlFor="event-location">Event Location *</Label>
        <div className="flex items-center gap-2">
          <Input id="event-location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} required />
          <Button type="button" variant="outline" onClick={handleDetectLocation} disabled={isDetectingLocation}>
            <MapPin className="h-4 w-4 mr-2" />
            {isDetectingLocation ? 'Detecting...' : 'Detect'}
          </Button>
        </div>
      </div>
      {/* ... Rest of the form fields and submit button ... */}
    </form>
  );
}