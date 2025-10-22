import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Crown, Loader2, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProBadge } from "@/components/ProBadge";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    console.log('=== SubscriptionSuccess: Component Mounted ===');
    console.log('Full URL:', window.location.href);
    console.log('Search Params:', searchParams.toString());
    console.log('User state:', user ? `Logged in (${user.id})` : 'Not logged in');
    
    const allParams = Object.fromEntries(searchParams.entries());
    console.log('All URL parameters:', allParams);
    setDebugInfo(JSON.stringify({ url: window.location.href, params: allParams, user: user?.id }, null, 2));

    const subscriptionId = searchParams.get('subscription_id');
    const token = searchParams.get('token');
    const ba_token = searchParams.get('ba_token'); // PayPal billing agreement token
    const paymentId = searchParams.get('paymentId');
    const PayerID = searchParams.get('PayerID');

    console.log('Extracted parameters:', { 
      subscriptionId, 
      token, 
      ba_token, 
      paymentId, 
      PayerID 
    });

    if (!user) {
      console.log('❌ No user found - redirecting to auth');
      setProcessing(false);
      navigate('/auth');
      return;
    }

    // Check if we have any subscription-related parameters
    const hasSubscriptionData = subscriptionId || ba_token || paymentId;
    
    // Always check Pro status first (webhook might have already activated)
    console.log('🔍 Checking Pro status first...');
    checkProStatus().then((alreadyPro) => {
      if (!alreadyPro && hasSubscriptionData) {
        // Only call edge function if not already Pro
        console.log('✅ Not Pro yet, calling activation function with:', subscriptionId || ba_token || paymentId);
        activateProSubscription(subscriptionId || ba_token || paymentId, token);
      } else if (alreadyPro) {
        console.log('✅ Already Pro from webhook!');
      } else {
        console.log('⚠️ No subscription data and not Pro - possible error');
      }
    });
  }, [searchParams, user, navigate]);

  const checkProStatus = async (): Promise<boolean> => {
    try {
      console.log('🔍 Checking current Pro status...');
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('is_pro_subscriber, subscription_status, paypal_subscription_id')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error checking Pro status:', error);
        setProcessing(false);
        return false;
      }

      console.log('Pro status check result:', data);
      
      if (data?.is_pro_subscriber) {
        console.log('✅ User is already Pro - showing success');
        setSuccess(true);
        setProcessing(false);
        toast({
          title: "Welcome to QTalent Pro!",
          description: "Your subscription is active.",
        });
        return true;
      } else {
        console.log('❌ User is not Pro yet');
        return false;
      }
    } catch (error) {
      console.error('Error in checkProStatus:', error);
      setProcessing(false);
      return false;
    }
  };

  const activateProSubscription = async (subscriptionId: string, token: string | null) => {
    try {
      console.log('🚀 Starting subscription activation...');
      console.log('Subscription ID:', subscriptionId);
      console.log('Token:', token ? 'Present' : 'Not provided');
      console.log('User ID:', user?.id);

      const { data, error } = await supabase.functions.invoke('activate-paypal-subscription', {
        body: {
          subscriptionId,
          token
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      if (data?.success) {
        console.log('✅ Subscription activated successfully');
        setSuccess(true);
        toast({
          title: "Welcome to QTalent Pro!",
          description: "Your subscription has been activated successfully.",
          duration: 5000,
        });
      } else {
        console.error('❌ Activation failed:', data?.error);
        throw new Error(data?.error || 'Failed to activate subscription');
      }
    } catch (error) {
      console.error('❌ Error in activateProSubscription:', error);
      
      // Show detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Activation Error",
        description: `Failed to activate subscription: ${errorMessage}. Please contact support with this error.`,
        variant: "destructive",
        duration: 10000,
      });

      // Still show success page but with a warning
      setSuccess(true);
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
    <div className="container mx-auto px-4 py-16 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Professional Success Header */}
        <div className="text-center mb-12">
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-brand-success/20 rounded-full animate-live-glow"></div>
            <div className="relative w-16 h-16 bg-brand-success rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-background" />
            </div>
          </div>
          <h1 className="text-display mb-4 text-foreground">
            Welcome to Pro
          </h1>
          <p className="text-subhead max-w-2xl mx-auto">
            Your subscription has been confirmed. You now have access to all premium features.
          </p>
        </div>

        {/* Main Success Card */}
        <Card className="glass-card border-card-border mb-8">
          <CardHeader className="text-center pb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-brand-success/10 rounded-full flex items-center justify-center">
                  <Crown className="h-10 w-10 text-brand-success" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <ProBadge size="lg" />
                </div>
              </div>
            </div>
            <CardTitle className="text-headline text-foreground mb-4">
              Subscription Activated
            </CardTitle>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Your Pro membership is now active. Start maximizing your potential with enhanced features.
            </p>
          </CardHeader>

          <CardContent className="space-y-8 p-8">
            {/* Pro Benefits Section */}
            <div className="bg-card/50 rounded-xl p-8 border border-border">
              <h3 className="text-xl font-semibold mb-8 text-center text-foreground">
                Your Pro Benefits
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <CheckCircle className="h-5 w-5 text-brand-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">10 Profile Images</p>
                      <p className="text-sm text-muted-foreground">Showcase your work professionally</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <CheckCircle className="h-5 w-5 text-brand-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Media Integration</p>
                      <p className="text-sm text-muted-foreground">Link audio & video content</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <CheckCircle className="h-5 w-5 text-brand-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Featured Listing</p>
                      <p className="text-sm text-muted-foreground">Priority in search results</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <CheckCircle className="h-5 w-5 text-brand-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Unlimited Bookings</p>
                      <p className="text-sm text-muted-foreground">No monthly booking limits</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <CheckCircle className="h-5 w-5 text-brand-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Priority Support</p>
                      <p className="text-sm text-muted-foreground">Faster response times</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                onClick={() => navigate('/talent-dashboard')}
                className="hero-button gap-2"
                size="lg"
              >
                Access Pro Dashboard
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="outline-button gap-2"
                size="lg"
              >
                <Home className="h-5 w-5" />
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Information */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-secondary/50 border border-border">
            <CheckCircle className="h-4 w-4 text-brand-success" />
            <span className="text-sm text-muted-foreground">
              Subscription active • Manage through PayPal account
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}