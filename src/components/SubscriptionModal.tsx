import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

// --- IMPORTANT: Paste your Live Client ID here ---
// Since you cannot use environment variables on your platform, we will set the ID directly.
const PAYPAL_LIVE_CLIENT_ID = "AX6bUOWtKGKAaD0Ry62rtK3jhTDGfzpSMuJCABbUeVENyKdBAei_-xGiY8wT1vvXTypXkHWijfJHENcA";

export function SubscriptionModal({ open, onOpenChange }: SubscriptionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  const plans = [
    {
      id: "monthly",
      name: "Monthly Pro",
      price: "$19.99",
      period: "/month",
      // ### FIX #1: REPLACE THIS WITH YOUR *LIVE* MONTHLY PLAN ID ###
      planId: "P-9NW37063VU373363ENCYI3LY",
      features: [
        "Up to 10 profile images",
        "Audio & video links on profile",
        "Full messaging access",
        "Featured in Pro Artists section",
        "Pro badge for trust & visibility",
        "Unlimited booking requests",
        "Priority customer support",
      ],
      popular: false,
    },
    {
      id: "yearly",
      name: "Yearly Pro",
      price: "$179.88",
      period: "/year",
      // ### FIX #2: REPLACE THIS WITH YOUR *LIVE* YEARLY PLAN ID ###
      planId: "P-83U36288W1589964ANCYI6QQ",
      features: [
        "Everything in Monthly Pro",
        "Save $60 per year",
        "Best value for serious performers",
        "All premium features included",
      ],
      popular: true,
      savings: "Save $60!",
    },
  ];

  // Load PayPal SDK
  useEffect(() => {
    if (!open || !PAYPAL_LIVE_CLIENT_ID || PAYPAL_LIVE_CLIENT_ID.includes("REPLACE_WITH")) return;

    const loadPayPalScript = () => {
      if (window.paypal) {
        setPaypalLoaded(true);
        return;
      }

      const script = document.createElement("script");
      // Use your Live Client ID from the constant above
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_LIVE_CLIENT_ID}&vault=true&intent=subscription`;
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

    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) return;

    const containerId = `paypal-button-container-${plan.id}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear any existing PayPal buttons
    container.innerHTML = "";

    window.paypal
      .Buttons({
        createSubscription: async (data, actions) => {
          // This part is correct! It sends the user.id as custom_id
          const subscriptionData = {
            plan_id: plan.planId,
            custom_id: user.id, // This is working perfectly!
            application_context: {
              brand_name: "QTalent",
              shipping_preference: "NO_SHIPPING",
              user_action: "SUBSCRIBE_NOW",
              return_url: `${window.location.origin}/subscription-success`,
              cancel_url: `${window.location.origin}/subscription-cancelled`,
            },
          };
          const result = await actions.subscription.create(subscriptionData);
          return result;
        },
        onApprove: async (data, actions) => {
          toast({
            title: "Subscription Successful!",
            description: "Redirecting to confirmation page...",
            duration: 3000,
          });
          onOpenChange(false);
          const redirectUrl = new URL("/subscription-success", window.location.origin);
          if (data.subscriptionID) {
            redirectUrl.searchParams.set("subscription_id", data.subscriptionID);
          }
          navigate(redirectUrl.pathname + redirectUrl.search);
        },
        onError: (err) => {
          console.error("PayPal onError handler triggered", err);
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
          shape: "rect",
          color: "gold",
          layout: "vertical",
          label: "subscribe",
        },
      })
      .render(`#${containerId}`);
  }, [paypalLoaded, selectedPlan, user, plans, toast, onOpenChange, navigate]);

  // The rest of your UI code is perfect and does not need to be changed.
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
          <p className="text-muted-foreground">Unlock premium features and keep 100% of your earnings</p>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.popular ? "border-accent shadow-lg" : "border-border"}`}>
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
                    <span className="text-lg font-normal text-muted-foreground">{plan.period}</span>
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
                    <div id={`paypal-button-container-${plan.id}`} className="min-h-[50px]"></div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)} className="w-full">
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
