import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalSubscriptionResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { planType } = await req.json();
    console.log('Creating PayPal subscription for user:', user.id, 'plan:', planType);

    // Get PayPal credentials
    const clientId = Deno.env.get('PAYPAL_SANDBOX_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_SANDBOX_CLIENT_SECRET');
    const businessEmail = Deno.env.get('PAYPAL_SANDBOX_BUSINESS_EMAIL');

    if (!clientId || !clientSecret || !businessEmail) {
      throw new Error('PayPal credentials not configured');
    }

    // PayPal API endpoints (sandbox)
    const paypalBaseUrl = 'https://api-m.sandbox.paypal.com';

    // Get PayPal access token
    const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get PayPal access token');
    }

    const tokenData: PayPalTokenResponse = await tokenResponse.json();
    console.log('Got PayPal access token');

    // Create subscription plan data - using real PayPal plan IDs
    const planId = planType === 'yearly' ? 'P-83U36288W1589964ANCYI6QQ' : 'P-9NW37063VU373363ENCYI3LY';
    const amount = planType === 'yearly' ? '179.88' : '19.99';
    
    // Create subscription
    const subscriptionData = {
      plan_id: planId,
      subscriber: {
        email_address: user.email,
      },
      custom_id: user.id, // Pass user ID to webhook
      application_context: {
        brand_name: 'QTalent',
        landing_page: 'BILLING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${req.headers.get('origin')}/subscription-success?user_id=${user.id}`,
        cancel_url: `${req.headers.get('origin')}/subscription-cancelled`,
      },
    };

    console.log('Creating PayPal subscription with data:', subscriptionData);

    const subscriptionResponse = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
        'PayPal-Request-Id': `subscription-${user.id}-${Date.now()}`,
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text();
      console.error('PayPal subscription creation failed:', errorText);
      throw new Error('Failed to create PayPal subscription');
    }

    const subscriptionResult: PayPalSubscriptionResponse = await subscriptionResponse.json();
    console.log('PayPal subscription created:', subscriptionResult.id);

    // Find the approval URL
    const approvalLink = subscriptionResult.links.find(link => link.rel === 'approve');
    
    if (!approvalLink) {
      throw new Error('No approval URL found in PayPal response');
    }

    return new Response(JSON.stringify({
      success: true,
      subscriptionId: subscriptionResult.id,
      approvalUrl: approvalLink.href,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating PayPal subscription:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});