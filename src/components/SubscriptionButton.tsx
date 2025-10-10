import { useState, useEffect } from "react";
import { Crown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProBadge } from "@/components/ProBadge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { SubscriptionManagementModal } from "@/components/SubscriptionManagementModal";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionButtonProps {
  isProSubscriber?: boolean;
  onSubscriptionChange?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

interface SubscriptionData {
  isProSubscriber: boolean;
  subscriptionStatus: string;
  planId?: string;
  currentPeriodEnd?: string;
  subscriptionStartedAt?: string;
  paypal_subscription_id?: string;
  provider?: string; // 'paypal' or 'manual'
  manualGrantExpiresAt?: string;
  grantedByAdminId?: string;
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
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    if (user && isProSubscriber) {
      fetchSubscriptionData();
    }
  }, [user, isProSubscriber]);

  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      // Fetch subscription data including provider info
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('is_pro_subscriber, subscription_status, plan_id, current_period_end, subscription_started_at, paypal_subscription_id, provider, manual_grant_expires_at, granted_by_admin_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription data:', error);
        return;
      }

      if (data) {
        setSubscriptionData({
          isProSubscriber: data.is_pro_subscriber || false,
          subscriptionStatus: data.subscription_status || 'free',
          planId: data.plan_id || undefined,
          currentPeriodEnd: data.current_period_end || undefined,
          subscriptionStartedAt: data.subscription_started_at || undefined,
          paypal_subscription_id: data.paypal_subscription_id || undefined,
          provider: data.provider || 'paypal',
          manualGrantExpiresAt: data.manual_grant_expires_at || undefined,
          grantedByAdminId: data.granted_by_admin_id || undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  };

  const calculateDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysRemaining = calculateDaysRemaining(subscriptionData?.currentPeriodEnd);

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
      setShowManagementModal(true);
    } else {
      setShowModal(true);
    }
  };

  if (isProSubscriber) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          onClick={handleSubscriptionAction}
          className={`${className} gap-2 relative`}
        >
          <Settings className="h-4 w-4" />
          <div className="flex flex-col items-start">
            <span>Manage Pro</span>
            {daysRemaining !== null && (
              <span className="text-xs opacity-80">
                {daysRemaining} days left
              </span>
            )}
          </div>
          <ProBadge size="sm" showIcon={false} />
        </Button>

        <SubscriptionManagementModal
          open={showManagementModal}
          onOpenChange={setShowManagementModal}
          subscriptionData={subscriptionData || undefined}
        />
      </>
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
