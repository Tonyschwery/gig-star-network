// FILE: src/components/BookingForm.tsx

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";

import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [bookerName, setBookerName] = useState(user?.user_metadata?.name || "");
  const [bookerPhone, setBookerPhone] = useState<string | undefined>();
  const [eventDate, setEventDate] = useState<Date>();
  const [eventDuration, setEventDuration] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [detectedCountry, setDetectedCountry] = useState<string | undefined>();
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");

  // calendar state to auto-close popover
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const eventTypes = ["wedding", "birthday", "corporate", "opening", "club", "school", "festival", "private party", "other"];

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
          const { data, error } = await supabase.functions.invoke('reverse-geocode', {
            body: { latitude, longitude }
          });
          if (error) throw new Error(error.message);
          setEventLocation(data.formatted_address);
          setDetectedCountry(data.country_code);
          toast({ title: "Location Detected!", description: data.formatted_address });
        } catch (error: any) {
          toast({ title: "Could not fetch address", description: error.message, variant: "destructive" });
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        toast({ title: "Unable to retrieve your location.", description: "Please grant permission or enter it manually.", variant: "destructive" });
        setIsDetectingLocation(false);
      }
    );
  };

  useEffect(() => {
    if (!eventLocation) {
      handleDetectLocation();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Authentication Required", description: "Please sign in to book talent.", variant: "destructive" });
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
        event_address: eventLocation, // keep same field as old BookingForm
        event_type: eventType,
        description: description,
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
                  defaultCountry={detectedCountry as any}
                  className="phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type *</Label>
                <Select onValueChange={setEventType} required>
                  <SelectTrigger><SelectValue placeholder="Select an event type" /></SelectTrigger>
                  <SelectContent>
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
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={(date) => {
                        setEventDate(date);
                        setIsCalendarOpen(false); // auto-close after picking
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-location">Event Location *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="event-location"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  required
                  placeholder={isDetectingLocation ? "Detecting location..." : "Enter or detect location"}
                />
                {!isDetectingLocation && (
                  <Button type="button" variant="outline" onClick={handleDetectLocation}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Detect Again
                  </Button>
                )}
              </div>
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
