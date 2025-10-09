import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import { useAuth } from "@/hooks/useAuth";

export const NotificationPermissionPrompt = () => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, requestPermission } = useWebPushNotifications();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already been asked
    const hasAsked = localStorage.getItem('notification-permission-asked');
    
    // Show prompt if:
    // - User is logged in
    // - Notifications are supported
    // - User is not subscribed
    // - User hasn't dismissed it
    // - We haven't asked before
    if (user && isSupported && !isSubscribed && !isDismissed && !hasAsked) {
      // Wait 5 seconds before showing to not overwhelm user
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [user, isSupported, isSubscribed, isDismissed]);

  if (!isVisible) return null;

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      localStorage.setItem('notification-permission-asked', 'true');
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification-permission-asked', 'true');
    setIsDismissed(true);
    setIsVisible(false);
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 shadow-lg border-primary/20 animate-in slide-in-from-bottom-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Enable Notifications</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Stay updated with instant notifications about your bookings, messages, and important updates
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEnable} className="flex-1">
                Enable
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};