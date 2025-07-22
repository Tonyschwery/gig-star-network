import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { ProSubscriptionDialog } from './ProSubscriptionDialog';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface ProFeatureWrapperProps {
  children: React.ReactNode;
  isProFeature?: boolean;
  className?: string;
  showProIcon?: boolean;
}

export function ProFeatureWrapper({ 
  children, 
  isProFeature = false, 
  className,
  showProIcon = true 
}: ProFeatureWrapperProps) {
  const [showProDialog, setShowProDialog] = useState(false);

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
            className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300 hover:from-amber-500 hover:to-orange-600 shadow-lg"
            onClick={() => setShowProDialog(true)}
          >
            <Crown className="h-3 w-3 text-white" />
          </Button>
        )}
        
        <div className="absolute inset-0 bg-muted/20 rounded-md"></div>
      </div>

      <ProSubscriptionDialog
        open={showProDialog}
        onOpenChange={setShowProDialog}
        onSubscribe={() => {
          // Handle subscription logic here
          console.log('Navigate to subscription page');
          setShowProDialog(false);
        }}
        profileId="temp-profile-id" // This would be the actual profile ID
      />
    </>
  );
}