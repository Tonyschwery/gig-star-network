import { useState } from "react";
import { Crown, ExternalLink } from "lucide-react";
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
  planType?: "monthly" | "yearly";
}

export function SubscriptionButton({ 
  isProSubscriber = false, 
  onSubscriptionChange,
  variant = "default",
  size = "default",
  className = "",
  planType = "monthly"
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
        // For managing existing subscription - in real app, this would open PayPal management
        toast({
          title: "Subscription Management",
          description: "Contact support to manage your subscription or visit your PayPal account.",
          duration: 5000,
        });
      } else {
        // Create PayPal subscription
        toast({
          title: "Redirecting to PayPal...",
          description: "You'll be redirected to PayPal to complete your subscription.",
          duration: 3000,
        });

        const { data, error } = await supabase.functions.invoke('create-paypal-subscription', {
          body: { planType },
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (error) {
          throw error;
        }

        if (data?.success && data?.approvalUrl) {
          // Open PayPal subscription in new tab
          window.open(data.approvalUrl, '_blank');
        } else {
          throw new Error(data?.error || "Failed to create subscription");
        }
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

  const price = planType === "monthly" ? "$19.99/month" : "$179.88/year (save $60)";

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
        {isLoading ? "Loading..." : "Manage Pro"}
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
      <ExternalLink className="h-3 w-3 ml-1" />
      {isLoading ? "Loading..." : `Upgrade to Pro - ${price}`}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
    </Button>
  );
}
