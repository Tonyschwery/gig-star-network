import { useState } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionModal } from "@/components/SubscriptionModal";

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
  const [showModal, setShowModal] = useState(false);

  const handleSubscriptionAction = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to manage your subscription.",
        variant: "destructive",
      });
      return;
    }

    if (isProSubscriber) {
      // For managing existing subscription - in real app, this would open PayPal management
      toast({
        title: "Subscription Management",
        description: "Contact support to manage your subscription or visit your PayPal account.",
        duration: 5000,
      });
    } else {
      // Open subscription modal
      setShowModal(true);
    }
  };

  if (isProSubscriber) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleSubscriptionAction}
        className={`${className} gap-2`}
      >
        <Crown className="h-4 w-4" />
        Manage Pro
        <Badge variant="secondary" className="ml-1 text-xs">
          Pro
        </Badge>
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleSubscriptionAction}
        className={`${className} gap-2 relative overflow-hidden group`}
      >
        <Crown className="h-4 w-4 text-brand-warning" />
        Upgrade to Pro
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </Button>
      
      <SubscriptionModal 
        open={showModal} 
        onOpenChange={setShowModal}
      />
    </>
  );
}
