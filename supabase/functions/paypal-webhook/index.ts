import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received", { method: req.method });

    // Parse webhook payload
    const payload = await req.json();
    logStep("Webhook payload", { eventType: payload.event_type, resourceType: payload.resource_type });

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle different webhook events
    switch (payload.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        logStep("Processing subscription activation");
        const subscription = payload.resource;
        const userId = subscription.custom_id;

        if (!userId) {
          logStep("No user ID found in subscription");
          break;
        }

        // Update talent profile to Pro status
        const { error } = await supabaseClient
          .from('talent_profiles')
          .update({ 
            is_pro_subscriber: true,
            subscription_status: 'active',
            subscription_started_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) {
          logStep("Error updating talent profile", { error: error.message });
          throw error;
        }

        logStep("Subscription activated successfully", { userId });
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        logStep("Processing subscription cancellation/suspension");
        const subscription = payload.resource;
        const userId = subscription.custom_id;

        if (!userId) {
          logStep("No user ID found in subscription");
          break;
        }

        // Update talent profile to free status
        const { error } = await supabaseClient
          .from('talent_profiles')
          .update({ 
            is_pro_subscriber: false,
            subscription_status: 'free',
            subscription_started_at: null
          })
          .eq('user_id', userId);

        if (error) {
          logStep("Error updating talent profile", { error: error.message });
          throw error;
        }

        logStep("Subscription cancelled/suspended successfully", { userId });
        break;
      }

      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        logStep("Processing payment failure");
        const subscription = payload.resource;
        const userId = subscription.custom_id;

        if (!userId) {
          logStep("No user ID found in subscription");
          break;
        }

        // Create notification for payment failure
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'payment_failed',
            title: 'Payment Failed',
            message: 'Your subscription payment failed. Please update your payment method to continue enjoying Pro benefits.',
          });

        logStep("Payment failure notification created", { userId });
        break;
      }

      case "BILLING.SUBSCRIPTION.RENEWED": {
        logStep("Processing subscription renewal");
        const subscription = payload.resource;
        const userId = subscription.custom_id;

        if (!userId) {
          logStep("No user ID found in subscription");
          break;
        }

        // Create notification for successful renewal
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'subscription_renewed',
            title: 'Subscription Renewed',
            message: 'Your Qtalent Pro subscription has been successfully renewed. Thank you for staying with us!',
          });

        logStep("Subscription renewal notification created", { userId });
        break;
      }

      default:
        logStep("Unhandled webhook event", { eventType: payload.event_type });
        break;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing webhook", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});