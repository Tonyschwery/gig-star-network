import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";
import { Mail, Bell, CreditCard, MessageSquare } from "lucide-react";

interface EmailPreferences {
  booking_notifications: boolean;
  payment_notifications: boolean;
  message_notifications: boolean;
  marketing_emails: boolean;
}

export function EmailPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<EmailPreferences>({
    booking_notifications: true,
    payment_notifications: true,
    message_notifications: true,
    marketing_emails: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading email preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          booking_notifications: data.booking_notifications,
          payment_notifications: data.payment_notifications,
          message_notifications: data.message_notifications,
          marketing_emails: data.marketing_emails,
        });
      }
    } catch (error) {
      console.error('Error loading email preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Preferences saved",
        description: "Your email notification preferences have been updated.",
      });
    } catch (error) {
      console.error('Error saving email preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save email preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof EmailPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Preferences
          </CardTitle>
          <CardDescription>
            Loading your email preferences...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Preferences
        </CardTitle>
        <CardDescription>
          Choose which email notifications you'd like to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="booking-notifications" className="text-sm font-medium">
                Booking Notifications
              </Label>
            </div>
            <Switch
              id="booking-notifications"
              checked={preferences.booking_notifications}
              onCheckedChange={(checked) => updatePreference('booking_notifications', checked)}
            />
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            Get notified when bookings are created, approved, declined, or completed
          </p>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="payment-notifications" className="text-sm font-medium">
                Payment Notifications
              </Label>
            </div>
            <Switch
              id="payment-notifications"
              checked={preferences.payment_notifications}
              onCheckedChange={(checked) => updatePreference('payment_notifications', checked)}
            />
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            Get notified when payments are processed or received
          </p>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="message-notifications" className="text-sm font-medium">
                Message Notifications
              </Label>
            </div>
            <Switch
              id="message-notifications"
              checked={preferences.message_notifications}
              onCheckedChange={(checked) => updatePreference('message_notifications', checked)}
            />
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            Get notified when you receive new messages about your bookings
          </p>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="marketing-emails" className="text-sm font-medium">
                Marketing Emails
              </Label>
            </div>
            <Switch
              id="marketing-emails"
              checked={preferences.marketing_emails}
              onCheckedChange={(checked) => updatePreference('marketing_emails', checked)}
            />
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            Receive updates about new features, promotions, and platform news
          </p>
        </div>

        <div className="pt-4">
          <Button 
            onClick={savePreferences} 
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}