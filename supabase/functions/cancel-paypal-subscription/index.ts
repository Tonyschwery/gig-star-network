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
    console.log('Cancel PayPal subscription request received');
    
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

    const { subscriptionId } = await req.json();
    
    if (!subscriptionId) {
      throw new Error('No subscription ID provided');
    }

    console.log('Cancelling subscription:', subscriptionId, 'for user:', user.id);

    // Check if this is a manual grant (not a PayPal subscription)
    const { data: profile, error: profileError } = await supabase
      .from('talent_profiles')
      .select('provider, is_pro_subscriber')
      .eq('user_id', user.id)
      .eq('paypal_subscription_id', subscriptionId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Failed to verify subscription');
    }

    if (!profile) {
      throw new Error('Subscription not found for this user');
    }

    // Prevent cancellation of manual grants via this endpoint
    if (profile.provider === 'manual') {
      throw new Error('Cannot cancel admin-granted subscriptions via this method. Please contact an administrator.');
    }

    console.log('Verified PayPal subscription, proceeding with cancellation');

    // Get PayPal credentials (use live credentials)
    const clientId = Deno.env.get('PAYPAL_LIVE_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_LIVE_CLIENT_SECRET');

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
      const errorText = await tokenResponse.text();
      console.error('Failed to get PayPal access token:', errorText);
      throw new Error('Failed to get PayPal access token');
    }

    const tokenData = await tokenResponse.json();

    // Cancel the subscription via PayPal API
    const cancelResponse = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Customer requested cancellation'
      }),
    });

    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      console.error('Failed to cancel PayPal subscription:', errorText);
      throw new Error('Failed to cancel subscription with PayPal');
    }

    console.log('PayPal subscription cancelled successfully');

    // Update user's talent profile in database
    const { error: updateError } = await supabase
      .from('talent_profiles')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('paypal_subscription_id', subscriptionId);

    if (updateError) {
      console.error('Error updating talent profile:', updateError);
      throw new Error('Failed to update subscription status in database');
    }

    // Create notification for the user
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: user.id,
          type: 'subscription_cancelled',
          title: 'Subscription Cancelled',
          message: 'Your Pro subscription has been cancelled. You will retain Pro access until the end of your current billing period.',
        }
      ]);

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    console.log('Successfully cancelled subscription for user:', user.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription cancelled successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error cancelling PayPal subscription:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
