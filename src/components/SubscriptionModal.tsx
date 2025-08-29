import { useState } from "react";
import { Crown, ExternalLink, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionModal({ open, onOpenChange }: SubscriptionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const plans = [
    {
      id: "monthly",
      name: "Monthly Pro",
      price: "$19.99",
      period: "/month",
      planId: "P-5DD48036RS5113705NCY45IY",
      features: [
        "Zero commission - keep 100% of earnings",
        "Up to 10 profile images",
        "Audio & video links on profile",
        "Full messaging access",
        "Featured in Pro Artists section",
        "Pro badge for trust & visibility",
        "Unlimited booking requests",
        "Priority customer support"
      ],
      popular: false
    },
    {
      id: "yearly",
      name: "Yearly Pro", 
      price: "$179.88",
      period: "/year",
      planId: "P-8R7404252P6382316NCY46DA",
      features: [
        "Everything in Monthly Pro",
        "Save $60 per year",
        "Best value for serious performers",
        "All premium features included"
      ],
      popular: true,
      savings: "Save $60!"
    }
  ];

  const handleSubscribe = async (planType: "monthly" | "yearly", planId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe to Pro.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(planType);

      toast({
        title: "Redirecting to PayPal...",
        description: "You'll be redirected to PayPal to complete your subscription.",
        duration: 3000,
      });

      const { data, error } = await supabase.functions.invoke('create-paypal-subscription', {
        body: { planType },
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.approvalUrl) {
        // Close modal and redirect to PayPal
        onOpenChange(false);
        window.location.href = data.approvalUrl;
      } else {
        throw new Error(data?.error || "Failed to create subscription");
      }

    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-2xl md:text-3xl flex items-center justify-center gap-3">
            <Crown className="h-6 w-6 md:h-8 w-8 text-brand-warning" />
            Choose Your Pro Plan
          </DialogTitle>
          <p className="text-muted-foreground">
            Unlock premium features and keep 100% of your earnings
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative ${
                plan.popular ? 'border-accent shadow-lg' : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground">
                    <Crown className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <div className="text-3xl font-bold">
                    {plan.price}
                    <span className="text-lg font-normal text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  {plan.savings && (
                    <div className="text-sm text-brand-success font-medium mt-2 bg-brand-success/10 rounded-full px-3 py-1">
                      {plan.savings}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  className="w-full gap-2 relative overflow-hidden group"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan.id as "monthly" | "yearly", plan.planId)}
                  disabled={isLoading === plan.id}
                >
                  <Crown className="h-4 w-4" />
                  <ExternalLink className="h-3 w-3" />
                  {isLoading === plan.id ? "Processing..." : `Subscribe ${plan.name}`}
                  {!isLoading && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground mt-6">
          <p>Secure payments powered by PayPal. Cancel anytime from your dashboard.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}