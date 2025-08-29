import { useState, useEffect } from "react";
import { Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// PayPal SDK types
declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        createSubscription: (data: any, actions: any) => Promise<string>;
        onApprove: (data: any, actions: any) => Promise<void>;
        onError: (err: any) => void;
        onCancel: (data: any) => void;
        style?: {
          shape?: string;
          color?: string;
          layout?: string;
          label?: string;
        };
      }) => {
        render: (selector: string) => Promise<void>;
      };
    };
  }
}

export function SubscriptionModal({ open, onOpenChange }: SubscriptionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

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

  // Load PayPal SDK
  useEffect(() => {
    if (!open) return;

    const loadPayPalScript = () => {
      if (window.paypal) {
        setPaypalLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=AU8JVXx6NV6vgdQ1CEtIdlKs_L_4tJQp6r-wyoJ_1X2iVAM7Z4WOyYjUBKgWTH9p7A0Ks4kVrYP1z7cS&vault=true&intent=subscription`;
      script.async = true;
      script.onload = () => setPaypalLoaded(true);
      script.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to load PayPal. Please refresh and try again.",
          variant: "destructive",
        });
      };
      document.head.appendChild(script);
    };

    loadPayPalScript();
  }, [open, toast]);

  // Render PayPal buttons when plan is selected and PayPal is loaded
  useEffect(() => {
    if (!paypalLoaded || !selectedPlan || !window.paypal || !user) return;

    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    const containerId = `paypal-button-container-${plan.id}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear any existing PayPal buttons
    container.innerHTML = '';

    window.paypal.Buttons({
      createSubscription: (data, actions) => {
        return actions.subscription.create({
          plan_id: plan.planId,
          custom_id: user.id, // Pass Supabase User ID
          subscriber: {
            email_address: user.email
          },
          application_context: {
            brand_name: "QTalent",
            shipping_preference: "NO_SHIPPING",
            user_action: "SUBSCRIBE_NOW"
          }
        });
      },
      onApprove: async (data, actions) => {
        toast({
          title: "Subscription Successful!",
          description: "Redirecting to confirmation page...",
          duration: 3000,
        });
        onOpenChange(false);
        // Redirect to success page with subscription details
        window.location.href = `/subscription-success?subscription_id=${data.subscriptionID}&token=${data.facilitatorAccessToken || ''}`;
      },
      onError: (err) => {
        console.error('PayPal error:', err);
        toast({
          title: "Subscription Error",
          description: "There was an issue processing your subscription. Please try again.",
          variant: "destructive",
        });
        setSelectedPlan(null);
      },
      onCancel: (data) => {
        toast({
          title: "Subscription Cancelled",
          description: "You cancelled the subscription process.",
        });
        setSelectedPlan(null);
      },
      style: {
        shape: 'rect',
        color: 'gold',
        layout: 'vertical',
        label: 'subscribe'
      }
    }).render(`#${containerId}`);
  }, [paypalLoaded, selectedPlan, user, plans, toast, onOpenChange]);

  const handlePlanSelect = (planId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe to Pro.",
        variant: "destructive",
      });
      return;
    }

    if (!paypalLoaded) {
      toast({
        title: "Please wait",
        description: "PayPal is loading. Please try again in a moment.",
      });
      return;
    }

    setSelectedPlan(planId);
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
                
                {selectedPlan === plan.id ? (
                  <div className="space-y-4">
                    <div id={`paypal-button-container-${plan.id}`} className="min-h-[50px]">
                      {/* PayPal buttons will be rendered here */}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPlan(null)}
                      className="w-full"
                    >
                      Choose Different Plan
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full gap-2 relative overflow-hidden group"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={!paypalLoaded}
                  >
                    <Crown className="h-4 w-4" />
                    {paypalLoaded ? `Select ${plan.name}` : "Loading PayPal..."}
                    {paypalLoaded && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground mt-6">
          <p>Secure payments powered by PayPal. Cancel anytime from your PayPal account.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}