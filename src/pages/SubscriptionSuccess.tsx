import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const subscriptionId = searchParams.get('subscription_id');
    const token = searchParams.get('token');
    
    if (subscriptionId || token) {
      activateProSubscription();
    } else {
      setProcessing(false);
      setSuccess(true); // Assume success if we reached this page
    }
  }, [searchParams]);

  const activateProSubscription = async () => {
    try {
      setProcessing(true);
      
      // Get subscription parameters from URL
      const subscriptionId = searchParams.get('subscription_id');
      const token = searchParams.get('token');
      
      if (!subscriptionId || !token) {
        throw new Error('Missing subscription parameters');
      }

      // Activate subscription via edge function
      const { data, error } = await supabase.functions.invoke('activate-paypal-subscription', {
        body: { subscriptionId, token },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to activate subscription');
      }

      setSuccess(true);
      
      toast({
        title: "Welcome to Pro! 🎉",
        description: "Your Pro subscription is now active. Enjoy all the premium benefits!",
        duration: 5000,
      });
    } catch (error) {
      console.error('Error activating Pro subscription:', error);
      // Redirect to error page or show error message
      navigate('/subscription-cancelled');
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Processing your subscription...</h3>
            <p className="text-muted-foreground text-sm">Please wait while we activate your Pro features</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <CheckCircle className="h-16 w-16 text-accent" />
              <Crown className="h-6 w-6 text-brand-warning absolute -top-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Welcome to Pro! 🎉
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-muted-foreground">
            <p className="mb-4">
              Your Pro subscription has been activated successfully! You now have access to all premium features:
            </p>
            
            <div className="text-left space-y-2 bg-secondary/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span>Up to 10 profile images</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span>Audio & video links on profile</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span>Full messaging access (no filters)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span>Featured in Pro Artists section</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span>Pro badge for trust & visibility</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span>Unlimited booking requests</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-success">
                <Crown className="h-4 w-4" />
                <span>0% Commission - Keep 100% of earnings!</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              className="hero-button"
              onClick={() => navigate('/talent-dashboard')}
            >
              Go to Dashboard
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Your subscription will automatically renew. You can manage or cancel it anytime from your dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}