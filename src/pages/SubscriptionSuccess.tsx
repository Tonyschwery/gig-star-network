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
    
    if (hasSubscriptionData) {
      console.log('✅ Subscription data found - activating subscription');
      activateProSubscription(subscriptionId || ba_token || paymentId, token);
    } else {
      console.log('⚠️ No subscription parameters found - checking if webhook already processed');
      // Check if user is already Pro (webhook might have processed)
      checkProStatus();
    }
  }, [searchParams, user, navigate]);

  const checkProStatus = async () => {
    try {
      console.log('🔍 Checking current Pro status...');
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('is_pro_subscriber, subscription_status')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error checking Pro status:', error);
        setProcessing(false);
        setSuccess(false);
        return;
      }

      console.log('Pro status check result:', data);
      
      if (data?.is_pro_subscriber) {
        console.log('✅ User is already Pro - showing success');
        setSuccess(true);
        toast({
          title: "Welcome to QTalent Pro!",
          description: "Your subscription is active.",
        });
      } else {
        console.log('❌ User is not Pro - subscription activation may have failed');
        toast({
          title: "Subscription Status",
          description: "We're verifying your subscription. Please wait a moment...",
        });
        
        // Wait a bit and check again in case webhook is processing
        setTimeout(() => checkProStatus(), 3000);
      }
    } catch (error) {
      console.error('Error in checkProStatus:', error);
    } finally {
      setProcessing(false);
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
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        {/* Hero Congratulations Section */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 blur-xl opacity-30 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black px-8 py-4 rounded-2xl shadow-2xl border-4 border-amber-300">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Crown className="h-8 w-8 animate-bounce" />
                <span className="text-3xl font-black tracking-wider">CONGRATULATIONS!</span>
                <Crown className="h-8 w-8 animate-bounce" />
              </div>
              <p className="text-lg font-bold">You are now a QTalent Pro Artist!</p>
            </div>
          </div>
        </div>

        <Card className="border-amber-200 shadow-2xl bg-gradient-to-b from-amber-50 to-white">
          <CardHeader className="text-center pb-6 bg-gradient-to-r from-amber-100/50 to-yellow-100/50 rounded-t-lg">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <CheckCircle className="h-20 w-20 text-green-600" />
                <div className="absolute -top-3 -right-3">
                  <ProBadge size="lg" />
                </div>
              </div>
            </div>
            <CardTitle className="text-4xl text-green-700 mb-2">
              Welcome to QTalent Pro!
            </CardTitle>
            <p className="text-xl text-slate-600">
              Your Pro subscription is now active and you're ready to maximize your earnings!
            </p>
          </CardHeader>

          <CardContent className="space-y-8 p-8">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-8 border-2 border-amber-200">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-center justify-center">
                <Crown className="h-6 w-6 text-amber-600" />
                Your Exclusive Pro Benefits Are Now Active
                <Crown className="h-6 w-6 text-amber-600" />
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">Zero Commission - Keep 100% of Your Earnings</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">Up to 10 Profile Images</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">Audio & Video Links on Profile</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">Featured in Pro Artists Section</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">Unlimited Booking Requests</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">Priority Customer Support</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/talent-dashboard')}
                className="gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-3 px-6 text-lg shadow-lg"
                size="lg"
              >
                Go to Your Pro Dashboard
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="gap-2 border-2 border-amber-400 text-amber-700 hover:bg-amber-50 py-3 px-6 text-lg"
                size="lg"
              >
                <Home className="h-5 w-5" />
                Back to Home
              </Button>
            </div>

            <div className="text-center text-sm text-slate-500 border-t pt-6 bg-slate-50 -mx-8 -mb-8 p-6 rounded-b-lg">
              <p className="mb-2 font-semibold">🎉 You're now part of an exclusive community of professional artists!</p>
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