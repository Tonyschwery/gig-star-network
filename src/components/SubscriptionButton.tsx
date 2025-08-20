import { useState } from "react";
import { Crown, CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionButtonProps {
  isProSubscriber?: boolean;
  onSubscriptionChange?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function SubscriptionButton({ 
  isProSubscriber = false, 
  onSubscriptionChange,
  variant = "default",
  size = "default",
  className = ""
}: SubscriptionButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscriptionAction = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to manage your subscription.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      if (isProSubscriber) {
        // For mock testing - simulate subscription management
        toast({
          title: "✅ Mock Subscription Management",
          description: "In production, this would open Stripe Customer Portal. Simulating cancellation...",
          duration: 4000,
        });
        
        // Simulate subscription cancellation for testing
        setTimeout(() => {
          if (onSubscriptionChange) {
            onSubscriptionChange();
          }
          toast({
            title: "Subscription Updated",
            description: "Mock subscription has been cancelled for testing.",
          });
          // Reload to refresh UI state
          window.location.reload();
        }, 2000);
        
      } else {
        // For mock testing - simulate successful subscription
        toast({
          title: "🎉 Mock Payment Successful!",
          description: "Simulating successful Pro subscription activation...",
          duration: 4000,
        });
        
        // Simulate successful subscription for testing
        setTimeout(() => {
          if (onSubscriptionChange) {
            onSubscriptionChange();
          }
          toast({
            title: "Welcome to Pro! 👑",
            description: "Your Pro subscription is now active with 0% commission!",
            duration: 5000,
          });
          // Reload to refresh UI state and show Pro features
          window.location.reload();
        }, 2000);
      }

    } catch (error) {
      console.error('Subscription action error:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.subscribed && onSubscriptionChange) {
        onSubscriptionChange();
        toast({
          title: "Subscription updated",
          description: "Your subscription status has been refreshed.",
        });
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  if (isProSubscriber) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleSubscriptionAction}
        disabled={isLoading}
        className={`${className} gap-2`}
      >
        <Crown className="h-4 w-4" />
        {isLoading ? "Loading..." : "Manage Subscription"}
        <Badge variant="secondary" className="ml-1 text-xs">
          Pro
        </Badge>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSubscriptionAction}
      disabled={isLoading}
      className={`${className} gap-2 relative overflow-hidden group`}
    >
      <Crown className="h-4 w-4 text-brand-warning" />
      {isLoading ? "Loading..." : "Upgrade to Pro"}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
    </Button>
  );
}