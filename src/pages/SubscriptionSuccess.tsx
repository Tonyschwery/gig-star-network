import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Crown, Loader2, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const subscriptionId = searchParams.get('subscription_id');
    const token = searchParams.get('token');

    if (subscriptionId && user) {
      activateProSubscription(subscriptionId, token);
    } else if (user) {
      // If no subscription ID but user is logged in, assume webhook already processed
      setProcessing(false);
      setSuccess(true);
    } else {
      navigate('/auth');
    }
  }, [searchParams, user, navigate]);

  const activateProSubscription = async (subscriptionId: string, token: string | null) => {
    try {
      const { data, error } = await supabase.functions.invoke('activate-paypal-subscription', {
        body: {
          subscriptionId,
          token
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setSuccess(true);
        toast({
          title: "Welcome to QTalent Pro!",
          description: "Your subscription has been activated successfully.",
          duration: 5000,
        });
      } else {
        throw new Error(data?.error || 'Failed to activate subscription');
      }
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast({
        title: "Activation Error",
        description: "There was an issue activating your subscription. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-accent" />
            <h2 className="text-xl font-semibold mb-2">Processing Your Subscription</h2>
            <p className="text-muted-foreground">
              Please wait while we activate your Pro subscription...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <Card className="border-accent/20 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-brand-success" />
                <Crown className="h-8 w-8 text-brand-warning absolute -top-2 -right-2" />
              </div>
            </div>
            <CardTitle className="text-3xl text-brand-success">
              Welcome to QTalent Pro!
            </CardTitle>
            <p className="text-lg text-muted-foreground mt-2">
              Your subscription has been activated successfully
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-accent/10 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5 text-brand-warning" />
                Your Pro Benefits Are Now Active
              </h3>
              <div className="grid gap-3 text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-brand-success" />
                  <span className="text-sm">Zero commission - keep 100% of your earnings</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-brand-success" />
                  <span className="text-sm">Up to 10 profile images</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-brand-success" />
                  <span className="text-sm">Audio & video links on profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-brand-success" />
                  <span className="text-sm">Featured in Pro Artists section</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-brand-success" />
                  <span className="text-sm">Unlimited booking requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-brand-success" />
                  <span className="text-sm">Priority customer support</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/talent-dashboard')}
                className="gap-2"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-4">
              <p>
                Your subscription will automatically renew. You can manage or cancel 
                your subscription anytime through your PayPal account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}