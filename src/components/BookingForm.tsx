import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, MapPin, X, User } from "lucide-react";
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

  const eventTypes = [
    "wedding",
    "birthday", 
    "corporate",
    "opening",
    "club",
    "school",
    "festival"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book a talent.",
        variant: "destructive",
      });
      return;
    }

    if (!bookerName || !eventDate || !eventDuration || !eventLocation || !eventAddress || !eventType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          talent_id: talentId,
          booker_name: bookerName,
          event_date: format(eventDate, 'yyyy-MM-dd'),
          event_duration: parseInt(eventDuration),
          event_location: eventLocation,
          event_address: eventAddress,
          event_type: eventType,
          description: description || null,
        });

      if (error) throw error;

      toast({
        title: "Booking Request Sent!",
        description: `Your booking request for ${talentName} has been submitted successfully.`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error submitting your booking request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Your Event</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-sm text-muted-foreground mb-4">
              Booking request for: <span className="font-medium text-primary">{talentName}</span>
            </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Event Description</Label>
              <Textarea
                id="description"
                placeholder="Tell us more about your event, special requirements, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 hero-button"
              >
                {isSubmitting ? "Submitting..." : "Send Booking Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}