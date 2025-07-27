import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap, MessageSquare, ExternalLink, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: () => void;
  profileId: string;
}

const benefits = [
  {
    icon: Crown,
    title: "Pro Artist Badge",
    description: "Stand out with a premium golden badge on your profile"
  },
  {
    icon: Zap,
    title: "No Service Fee",
    description: "Keep 100% of your earnings - no platform fees"
  },
  {
    icon: Search,
    title: "Priority in Search Results",
    description: "Appear at the top of search results for more visibility"
  },
  {
    icon: Star,
    title: "Feature on Landing Page",
    description: "Get showcased on our homepage to attract more bookings"
  },
  {
    icon: ExternalLink,
    title: "Add Personal Links",
    description: "Add your social media and website links to your profile"
  },
  {
    icon: MessageSquare,
    title: "Direct Messaging",
    description: "Communicate directly with bookers and organizers"
  }
];

export function ProSubscriptionDialog({ 
  open, 
  onOpenChange, 
  onSubscribe, 
  profileId 
}: ProSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Check if we have a valid profile ID
      if (!profileId || profileId === 'temp-id') {
        // During onboarding - just show success message
        onSubscribe();
        onOpenChange(false);
        
        toast({
          title: "Pro Features Activated! 🎉",
          description: "Your pro subscription will be activated when you complete your profile.",
          duration: 5000,
        });
        return;
      }

      // Activate pro subscription for existing profile
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

      onSubscribe();
      onOpenChange(false);
      
      toast({
        title: "Welcome to Pro! 🎉",
        description: "Your pro subscription is now active. Enjoy all the premium benefits!",
        duration: 5000,
      });
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast({
        title: "Error",
        description: "Failed to activate subscription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] overflow-y-auto glass-card">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text flex items-center gap-2">
            <Crown className="h-6 w-6 text-brand-warning" />
            Subscribe to Pro
          </DialogTitle>
          <DialogDescription className="text-lg">
            Unlock premium features and boost your talent career
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Benefits Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center">
                  <benefit.icon className="h-5 w-5 text-brand-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
                <Check className="h-5 w-5 text-brand-success flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="text-center p-6 rounded-xl bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 border border-brand-primary/20">
            <div className="inline-flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-brand-warning/20 text-brand-warning border-brand-warning/30">
                TESTING MODE
              </Badge>
            </div>
            <h3 className="text-xl font-bold mb-2">Pro Subscription</h3>
            <p className="text-muted-foreground mb-4">
              Currently activated for free during testing phase
            </p>
          </div>

          {/* Action Button */}
          <Button 
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full h-12 text-lg font-semibold hero-button"
          >
            {loading ? "Activating..." : "Activate Pro Features"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            * This is a test version. Payment integration will be added later.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}