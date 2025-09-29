import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { SubscriptionModal } from './SubscriptionModal';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useProStatus } from '@/contexts/ProStatusContext';

interface ProFeatureWrapperProps {
  children: React.ReactNode;
  isProFeature?: boolean;
  className?: string;
  showProIcon?: boolean;
  featureType?: 'images' | 'links' | 'messaging' | 'bookings' | 'general';
  context?: 'onboarding' | 'dashboard';
}

export function ProFeatureWrapper({ 
  children, 
  isProFeature = false, 
  className,
  showProIcon = true,
  featureType = 'general',
  context = 'dashboard'
}: ProFeatureWrapperProps) {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isProUser, loading } = useProStatus();


  const handleUpgradeClick = () => {
    if (context === 'onboarding') {
      toast({
        title: "Complete your profile first",
        description: "Finish creating your profile, then upgrade to Pro from your dashboard to unlock this feature",
      });
    } else {
      setShowSubscriptionModal(true);
    }
  };

  // Show loading state while checking Pro status
  if (loading) {
    return (
      <div className={cn("relative opacity-70", className)}>
        <div className="animate-pulse">
          {children}
        </div>
      </div>
    );
  }

  // If user is already Pro, don't restrict anything
  if (isProUser) {
    return <>{children}</>;
  }

  if (!isProFeature) {
    return <>{children}</>;
  }

  return (
    <>
      <div className={cn("relative", className)}>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        
        {showProIcon && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300 hover:from-amber-500 hover:to-orange-600 shadow-lg z-10"
            onClick={handleUpgradeClick}
          >
            <Crown className="h-3 w-3 text-white" />
          </Button>
        )}
        
        <div className="absolute inset-0 bg-muted/20 rounded-md"></div>
      </div>

      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
      />
    </>
  );
}