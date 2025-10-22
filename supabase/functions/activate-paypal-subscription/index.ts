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
    console.log('=== ACTIVATION REQUEST ===');
    console.log('User ID:', user.id);
    console.log('Subscription ID:', subscriptionId);
    console.log('PayPal Token provided:', !!paypalToken);

    // Check if user already has Pro status
    const { data: existingProfile, error: checkError } = await supabase
      .from('talent_profiles')
      .select('is_pro_subscriber, subscription_status, paypal_subscription_id')
      .eq('user_id', user.id)
      .single();

    console.log('Current profile status:', existingProfile);

    if (existingProfile?.is_pro_subscriber) {
      console.log('User is already Pro subscriber, skipping activation');
      return new Response(JSON.stringify({
        success: true,
        message: 'Already activated',
        already_pro: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get PayPal credentials
    const clientId = Deno.env.get('PAYPAL_LIVE_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_LIVE_CLIENT_SECRET');

    console.log('PayPal credentials available:', { clientId: !!clientId, clientSecret: !!clientSecret });

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    // PayPal API endpoints (live)
    const paypalBaseUrl = 'https://api-m.paypal.com';

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
    console.log('=== PAYPAL SUBSCRIPTION DATA ===');
    console.log('Status:', subscriptionData.status);
    console.log('Plan ID:', subscriptionData.plan_id);
    console.log('Custom ID:', subscriptionData.custom_id);
    console.log('Billing Info:', JSON.stringify(subscriptionData.billing_info, null, 2));

    // Check if subscription is active
    if (subscriptionData.status !== 'ACTIVE') {
      console.error('Subscription not active. Current status:', subscriptionData.status);
      throw new Error(`Subscription is not active. Status: ${subscriptionData.status}`);
    }

    // Determine subscription period
    let periodEndDate = new Date();
    const planId = subscriptionData.plan_id || '';
    
    if (planId.includes('monthly') || planId.includes('month')) {
      periodEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      console.log('Detected monthly plan');
    } else {
      periodEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      console.log('Detected yearly plan');
    }

    console.log('Period end date:', periodEndDate.toISOString());

    // Update user's talent profile to Pro status
    console.log('=== UPDATING TALENT PROFILE ===');
    const updateData = {
      is_pro_subscriber: true,
      subscription_status: 'active',
      paypal_subscription_id: subscriptionId,
      plan_id: planId,
      current_period_end: periodEndDate.toISOString(),
      subscription_started_at: new Date().toISOString(),
      provider: 'paypal',
      updated_at: new Date().toISOString(),
    };
    
    console.log('Update data:', updateData);

    const { data: updatedProfile, error: updateError } = await supabase
      .from('talent_profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .select();

    console.log('Update result:', { updatedProfile, updateError });

    if (updateError) {
      console.error('Error updating talent profile:', updateError);
      throw new Error(`Failed to activate Pro subscription: ${updateError.message}`);
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
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});