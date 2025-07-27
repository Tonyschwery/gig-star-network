import React, { useState, useEffect } from 'react';
import { Crown } from 'lucide-react';
import { ProSubscriptionDialog } from './ProSubscriptionDialog';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [profileId, setProfileId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get the current user's talent profile ID
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('talent_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data) {
          setProfileId(data.id);
        }
      }
    };

    fetchProfile();
  }, []);

  const handleActivatePro = async () => {
    if (!profileId) {
      // If no profile exists yet, show a message that pro will be activated
      toast({
        title: "Pro Features Activated! 🎉",
        description: "Your pro subscription will be activated when you complete your profile.",
        duration: 5000,
      });
      setShowProDialog(false);
      return;
    }
    
    // If profile exists, update it directly
    try {
      const { error } = await supabase
        .from('talent_profiles')
        .update({ 
          is_pro_subscriber: true,
          subscription_started_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) {
        throw error;
      }

      toast({
        title: "Welcome to Pro! 🎉",
        description: "Your pro subscription is now active. Enjoy all the premium benefits!",
        duration: 5000,
      });
      setShowProDialog(false);
      
      // Refresh the page to show updated features
      window.location.reload();
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast({
        title: "Error",
        description: "Failed to activate subscription. Please try again.",
        variant: "destructive"
      });
    }
  };

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
        onSubscribe={handleActivatePro}
        profileId={profileId || 'temp-id'}
      />
    </>
  );
}