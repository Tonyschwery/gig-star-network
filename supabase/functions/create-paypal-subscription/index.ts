import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYPAL-SUBSCRIPTION] ${step}${detailsStr}`);
};

// PayPal API helper
async function getPayPalAccessToken(isProduction = false): Promise<string> {
  const clientId = isProduction 
    ? Deno.env.get("PAYPAL_LIVE_CLIENT_ID")
    : Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID");
  const clientSecret = isProduction 
    ? Deno.env.get("PAYPAL_LIVE_CLIENT_SECRET") 
    : Deno.env.get("PAYPAL_SANDBOX_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const baseUrl = isProduction 
    ? "https://api-m.paypal.com" 
    : "https://api-m.sandbox.paypal.com";

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Accept-Language": "en_US",
      "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: "grant_type=client_credentials"
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${data.error_description}`);
  }

  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get request data
    const { planType } = await req.json();
    logStep("Request data", { planType });

    // Validate plan type
    if (!planType || !["monthly", "yearly"].includes(planType)) {
      throw new Error("Invalid plan type. Must be 'monthly' or 'yearly'");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get PayPal access token (use sandbox for now)
    const isProduction = false; // Using sandbox for testing
    const accessToken = await getPayPalAccessToken(isProduction);
    logStep("PayPal access token obtained");

    const baseUrl = isProduction 
      ? "https://api-m.paypal.com" 
      : "https://api-m.sandbox.paypal.com";

    // Create PayPal subscription plan with correct pricing
    const planPrice = planType === "monthly" ? "19.99" : "179.88"; // yearly = $179.88 (equivalent to $14.99/month)
    const planInterval = planType === "monthly" ? "MONTH" : "YEAR";
    const planName = `Qtalent Pro ${planType === "monthly" ? "Monthly" : "Annual"}`;

    // Create product first
    const productResponse = await fetch(`${baseUrl}/v1/catalogs/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "PayPal-Request-Id": `qtalent-product-${Date.now()}`
      },
      body: JSON.stringify({
        name: "Qtalent Pro Subscription",
        description: "Premium subscription for Qtalent talent profiles",
        type: "SERVICE",
        category: "SOFTWARE"
      })
    });

    let productData;
    if (productResponse.ok) {
      productData = await productResponse.json();
      logStep("Product created", { productId: productData.id });
    } else {
      const errorData = await productResponse.json();
      logStep("Product creation failed", { error: errorData });
      throw new Error(`Failed to create PayPal product: ${errorData.message || 'Unknown error'}`);
    }

    // Create billing plan
    const planResponse = await fetch(`${baseUrl}/v1/billing/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "PayPal-Request-Id": `qtalent-plan-${planType}-${Date.now()}`
      },
      body: JSON.stringify({
        product_id: productData.id,
        name: planName,
        description: `${planName} subscription for Qtalent Pro features`,
        status: "ACTIVE",
        billing_cycles: [
          {
            frequency: {
              interval_unit: planInterval,
              interval_count: 1
            },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0, // infinite
            pricing_scheme: {
              fixed_price: {
                value: planPrice,
                currency_code: "USD"
              }
            }
          }
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: {
            value: "0",
            currency_code: "USD"
          },
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 3
        }
      })
    });

    let planData;
    if (planResponse.ok) {
      planData = await planResponse.json();
      logStep("Billing plan created", { planId: planData.id });
    } else {
      const errorData = await planResponse.json();
      logStep("Plan creation failed", { error: errorData });
      throw new Error(`Failed to create PayPal plan: ${errorData.message || 'Unknown error'}`);
    }

    // Create subscription
    const origin = req.headers.get("origin") || "https://www.qtalent.live";
    const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "PayPal-Request-Id": `qtalent-sub-${user.id}-${Date.now()}`
      },
      body: JSON.stringify({
        plan_id: planData.id,
        subscriber: {
          email_address: user.email,
          name: {
            given_name: user.user_metadata?.name || "User",
            surname: ""
          }
        },
        application_context: {
          brand_name: "Qtalent",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          payment_method: {
            payer_selected: "PAYPAL",
            payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
          },
          return_url: `${origin}/subscription-success`,
          cancel_url: `${origin}/subscription-cancelled`
        },
        custom_id: user.id
      })
    });

    if (subscriptionResponse.ok) {
      const subscriptionData = await subscriptionResponse.json();
      logStep("Subscription created", { subscriptionId: subscriptionData.id });

      // Find approval URL
      const approvalLink = subscriptionData.links?.find((link: any) => link.rel === "approve");
      if (!approvalLink) {
        throw new Error("No approval URL found in PayPal response");
      }

      return new Response(JSON.stringify({ 
        success: true,
        approvalUrl: approvalLink.href,
        subscriptionId: subscriptionData.id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      const errorData = await subscriptionResponse.json();
      logStep("Subscription creation failed", { error: errorData });
      throw new Error(`Failed to create PayPal subscription: ${errorData.message || 'Unknown error'}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});