import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { Label } from "@/components/ui/label";
import { Label } from "@/components/ui/label";
//stk
export const BookingForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { sendEventRequestEmails } = useEmailNotifications();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    booker_name: '',
    booker_email: '',
    booker_phone: '',
    event_type: '',
    event_date: '',
    event_duration: 2,
    event_location: '',
    description: '',
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        booker_name: user.user_metadata?.name || '',
        booker_email: user.email || ''
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Please log in", description: "You must be logged in to submit an event request.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    setLoading(true);

    try {
      const requestData = {
        ...formData,
        user_id: user.id,
        status: 'pending',
      };
      const { error } = await supabase.from('event_requests').insert(requestData);

      if (error) throw error;
      
      // Send notifications after successful insert
      await sendEventRequestEmails(requestData);

      toast({
        title: "Request Sent!",
        description: "Our team has received your details. You can view your request on your dashboard.",
      });
      navigate('/booker-dashboard?tab=event_requests');

    } catch (error) {
      toast({ title: "Submission Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input name="booker_name" placeholder="Your Name" value={formData.booker_name} onChange={handleChange} required />
        <Input name="booker_email" type="email" placeholder="Your Email" value={formData.booker_email} onChange={handleChange} required />
      </div>
      <Input name="booker_phone" placeholder="Phone Number (Optional)" value={formData.booker_phone} onChange={handleChange} />
      <Input name="event_type" placeholder="Type of Event (e.g., Wedding, Corporate Party)" value={formData.event_type} onChange={handleChange} required />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input name="event_date" type="date" value={formData.event_date} onChange={handleChange} required />
        <Input name="event_duration" type="number" placeholder="Duration (hours)" value={formData.event_duration.toString()} onChange={handleChange} required />
      </div>
      <Input name="event_location" placeholder="Event Location (Country)" value={formData.event_location} onChange={handleChange} required />
      <Textarea name="description" placeholder="Tell us more about your event, including any specific talent you need..." value={formData.description} onChange={handleChange} />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Submitting...' : 'Send Request'}
      </Button>
    </form>
  );
};
