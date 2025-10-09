// FILE: src/components/BookingForm.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { LocationSelector } from "@/components/LocationSelector";
import { useLocationDetection } from "@/hooks/useLocationDetection";

import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface BookingFormProps {
  talentId: string;
  talentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingForm({ talentId, talentName, onClose, onSuccess }: BookingFormProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { sendBookingEmails } = useEmailNotifications();
  
  // Use location detection hook for consistent location handling
  const { userLocation, detectedLocation } = useLocationDetection();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookerName, setBookerName] = useState(user?.user_metadata?.name || "");
  const [bookerPhone, setBookerPhone] = useState<string | undefined>();
  const [eventDate, setEventDate] = useState<Date>();
  const [eventDuration, setEventDuration] = useState("");
  const [eventAddress, setEventAddress] = useState("");
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  
  // Local state for manually selected location - overrides detection
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const eventTypes = ["wedding", "birthday", "corporate", "opening", "club", "school", "festival", "private party", "other"];

  // Prioritize manually selected location over auto-detected
  const currentLocation = selectedLocation || userLocation || detectedLocation || 'Worldwide';
  
  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Authentication Required", description: "Please sign in to book talent.", variant: "destructive" });
      return;
    }
    if (!bookerName || !eventDate || !currentLocation || currentLocation === 'Worldwide' || !eventType || !eventDuration) {
      toast({ title: "Missing Information", description: "Please fill out all required fields and select a specific location.", variant: "destructive" });
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
        event_location: currentLocation, // Use standardized country name
        event_address: eventAddress, // Store venue address separately
        event_type: eventType,
        description: eventAddress ? `${description}\n\nVenue: ${eventAddress}` : description,
        status: 'pending',
      };

      const { data, error } = await supabase.from('bookings').insert(bookingData).select().single();
      if (error) throw error;

      await sendBookingEmails({ ...data, talent_name: talentName });

      toast({ title: "Booking Submitted!" });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col bg-card rounded-lg shadow-md overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-xl font-semibold">Book Talent</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {authLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !user ? (
            <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium mb-2">Authentication Required</p>
              <p className="text-xs text-muted-foreground mb-3">
                Please sign in or create an account to book this talent.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/auth?mode=booker&intent=booking'}
              >
                Sign In / Sign Up
              </Button>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground mb-6">
            Booking request for: <span className="font-medium text-primary">{talentName}</span>
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="booker-name">Your Name *</Label>
                <Input id="booker-name" value={bookerName} onChange={(e) => setBookerName(e.target.value)} required />
              </div>
                <div className="space-y-2">
                  <Label htmlFor="booker-phone">Phone Number</Label>
                  <PhoneInput
                    id="booker-phone"
                    placeholder="Enter phone number"
                    value={bookerPhone}
                    onChange={setBookerPhone}
                    international
                    className="phone-input"
                  />
                </div>
              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type *</Label>
                <Select onValueChange={setEventType} required>
                  <SelectTrigger><SelectValue placeholder="Select an event type" /></SelectTrigger>
                  <SelectContent className="z-[100] bg-background">
                    {eventTypes.map(type => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-date">Event Date *</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}
                      onClick={() => setIsCalendarOpen(true)}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100] bg-background">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={(date) => {
                        setEventDate(date);
                        setIsCalendarOpen(false); // auto-close after picking
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-location">Event Location *</Label>
              <LocationSelector onLocationChange={handleLocationChange} />
              <p className="text-xs text-muted-foreground">
                Selected location: {currentLocation === 'Worldwide' ? 'Please select a country' : currentLocation}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-address">Venue Address (Optional)</Label>
              <Input
                id="event-address"
                value={eventAddress}
                onChange={(e) => setEventAddress(e.target.value)}
                placeholder="Enter specific venue name or address"
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-duration">Event Duration (hours) *</Label>
                <Input
                  id="event-duration"
                  type="number"
                  placeholder="e.g., 3"
                  value={eventDuration}
                  onChange={(e) => setEventDuration(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Event Description</Label>
              <Textarea
                id="description"
                placeholder="Tell us more about your event..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:flex-1">
                {isSubmitting ? "Submitting..." : "Send Booking Request"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
