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
        // Open customer portal for subscription management
        const { data, error } = await supabase.functions.invoke('customer-portal', {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (error) throw error;

        if (data?.url) {
          window.open(data.url, '_blank');
        } else {
          throw new Error("No portal URL received");
        }
      } else {
        // Create checkout session for new subscription
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (error) throw error;

        if (data?.url) {
          window.open(data.url, '_blank');
        } else {
          throw new Error("No checkout URL received");
        }
      }

      // Trigger subscription check after a short delay to allow for processing
      setTimeout(() => {
        checkSubscriptionStatus();
      }, 3000);

    } catch (error) {
      console.error('Subscription action error:', error);
      toast({
        title: "Error",
        description: isProSubscriber 
          ? "Failed to open subscription management. Please try again."
          : "Failed to start subscription process. Please try again.",
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
      className={`${className} gap-2 relative overflow-hidden`}
    >
      <Crown className="h-4 w-4" />
      {isLoading ? "Loading..." : "Upgrade to Pro"}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/40 opacity-50 animate-pulse" />
    </Button>
  );
}