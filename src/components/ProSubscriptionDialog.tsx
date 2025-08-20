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
    description: "Stand out with a premium golden crown badge visible on your profile"
  },
  {
    icon: Zap,
    title: "Zero Commission (0% vs 20%)",
    description: "Keep 100% of your earnings - no platform fees for Pro subscribers!"
  },
  {
    icon: Search,
    title: "Priority Search Ranking",
    description: "Appear at the top of search results and get discovered first"
  },
  {
    icon: Star,
    title: "Premium Gig Access",
    description: "Get exclusive access to high-paying gigs and corporate events"
  },
  {
    icon: ExternalLink,
    title: "Enhanced Profile Features",
    description: "Add unlimited photos, videos, social links, and custom branding"
  },
  {
    icon: MessageSquare,
    title: "Advanced Messaging & Support",
    description: "Priority customer support and enhanced communication tools"
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
      // Get current user for database update
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // For mock testing - simulate successful subscription
      toast({
        title: "🎉 Mock Payment Successful!",
        description: "Activating your Pro subscription...",
        duration: 4000,
      });
      
      // Simulate successful subscription for testing
      setTimeout(async () => {
        // Update database to mark user as Pro subscriber
        const { data, error } = await supabase
          .from('talent_profiles')
          .update({ 
            is_pro_subscriber: true,
            subscription_status: 'pro',
            subscription_started_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select();

        if (error) {
          console.error('Database update error:', error);
          toast({
            title: "Database Error",
            description: `Failed to update subscription: ${error.message}`,
            variant: "destructive",
          });
          return;
        }

        console.log('Database update successful:', data);

        onSubscribe();
        onOpenChange(false);
        
        // Show detailed success message with benefits
        toast({
          title: "🎉 Welcome to Qtalent Pro! 👑",
          description: "✅ 0% Commission • ✅ Pro Badge • ✅ Priority Search • ✅ Unlimited Photos • ✅ Premium Gigs Access",
          duration: 8000,
        });
        
        // Show additional congratulations message
        setTimeout(() => {
          toast({
            title: "🚀 Pro Features Unlocked!",
            description: "You can now add unlimited gallery photos, music links, and access premium gig opportunities!",
            duration: 6000,
          });
        }, 2000);
        
        // Don't reload the page - just close dialog and update state
      }, 2000);
      
    } catch (error) {
      console.error('Error starting subscription:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 mb-8">
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

          {/* Feature Comparison Table */}
          <div className="bg-muted/30 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 text-center">Feature Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-sm font-medium">Feature</th>
                    <th className="text-center py-2 text-sm font-medium">Free</th>
                    <th className="text-center py-2 text-sm font-medium text-brand-primary">Pro</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-border/50">
                    <td className="py-3">Platform Commission</td>
                    <td className="text-center py-3 text-destructive font-semibold">20%</td>
                    <td className="text-center py-3 text-brand-success font-semibold">0%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">Profile Badge</td>
                    <td className="text-center py-3">Standard</td>
                    <td className="text-center py-3"><Crown className="h-4 w-4 text-brand-warning mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">Search Priority</td>
                    <td className="text-center py-3">Normal</td>
                    <td className="text-center py-3">Top Results</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">Premium Gigs</td>
                    <td className="text-center py-3">Limited</td>
                    <td className="text-center py-3">Full Access</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">Gallery Photos</td>
                    <td className="text-center py-3">5 max</td>
                    <td className="text-center py-3">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3">Customer Support</td>
                    <td className="text-center py-3">Standard</td>
                    <td className="text-center py-3">Priority</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing */}
          <div className="text-center p-6 rounded-xl bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 border border-brand-primary/20">
            <h3 className="text-3xl font-bold mb-2">
              $29
              <span className="text-lg font-normal text-muted-foreground">/month</span>
            </h3>
            <p className="text-muted-foreground mb-4">
              Cancel anytime • Keep 100% of your earnings with zero commission
            </p>
            <div className="text-sm text-brand-success font-semibold">
              Save $20 on every $100 earned - Zero platform fees!
            </div>
          </div>

          {/* Action Button */}
          <Button 
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full h-12 text-lg font-semibold hero-button"
          >
            {loading ? "Processing..." : profileId && profileId !== 'temp-id' ? "Subscribe Now - $29/month" : "Select Pro Plan"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment processed by Stripe • Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
