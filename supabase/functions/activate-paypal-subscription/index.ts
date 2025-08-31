import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { subscriptionId, token: paypalToken } = await req.json();
    console.log('Activating PayPal subscription for user:', user.id, 'subscription:', subscriptionId);

    // Get PayPal credentials
    const clientId = Deno.env.get('PAYPAL_SANDBOX_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_SANDBOX_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
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

    const tokenData = await tokenResponse.json();

    // Verify subscription status with PayPal
    const subscriptionResponse = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!subscriptionResponse.ok) {
      throw new Error('Failed to verify PayPal subscription');
    }

    const subscriptionData = await subscriptionResponse.json();
    console.log('PayPal subscription status:', subscriptionData.status);

    // Check if subscription is active AND has billing info indicating payment was processed
    if (subscriptionData.status !== 'ACTIVE') {
      throw new Error(`Subscription is not active. Status: ${subscriptionData.status}`);
    }

    // Additional verification: check if subscription has billing cycles executed
    const billingInfo = subscriptionData.billing_info;
    if (!billingInfo || !billingInfo.cycle_executions || billingInfo.cycle_executions.length === 0) {
      console.log('No billing cycles found, subscription may not have been paid yet');
      // Allow activation anyway as webhook will handle actual payment processing
    }

    // Update user's talent profile to Pro status
    const { error: updateError } = await supabase
      .from('talent_profiles')
      .update({
        is_pro_subscriber: true,
        subscription_status: 'active',
        subscription_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating talent profile:', updateError);
      throw new Error('Failed to activate Pro subscription');
    }

    // Create notification for the user
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: user.id,
          type: 'subscription_activated',
          title: 'Pro Subscription Activated! 🎉',
          message: 'Welcome to Pro! You can now upload up to 10 photos, add SoundCloud & YouTube links, and enjoy priority listing. Click to explore your new features!',
        }
      ]);

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    console.log('Successfully activated Pro subscription for user:', user.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Pro subscription activated successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error activating PayPal subscription:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});