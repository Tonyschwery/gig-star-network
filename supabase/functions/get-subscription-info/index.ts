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
    console.log('Get subscription info request received');
    
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

    console.log('Fetching subscription info for user:', user.id);

    // Get user's talent profile from database
    const { data: profile, error: profileError } = await supabase
      .from('talent_profiles')
      .select('is_pro_subscriber, subscription_status, plan_id, current_period_end, subscription_started_at, paypal_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching talent profile:', profileError);
      throw new Error('Failed to fetch subscription info');
    }

    if (!profile) {
      return new Response(JSON.stringify({
        success: true,
        subscriptionInfo: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate days remaining
    let daysRemaining = 0;
    if (profile.current_period_end) {
      const today = new Date();
      const endDate = new Date(profile.current_period_end);
      const diffTime = endDate.getTime() - today.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Determine plan type
    let planType = 'Free';
    if (profile.plan_id) {
      if (profile.plan_id.toLowerCase().includes('month')) {
        planType = 'Monthly';
      } else if (profile.plan_id.toLowerCase().includes('year')) {
        planType = 'Yearly';
      } else {
        planType = 'Pro';
      }
    }

    const subscriptionInfo = {
      isProSubscriber: profile.is_pro_subscriber,
      subscriptionStatus: profile.subscription_status,
      planType,
      planId: profile.plan_id,
      daysRemaining,
      renewalDate: profile.current_period_end,
      startedAt: profile.subscription_started_at,
      paypalSubscriptionId: profile.paypal_subscription_id,
    };

    console.log('Successfully fetched subscription info for user:', user.id);

    return new Response(JSON.stringify({
      success: true,
      subscriptionInfo,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching subscription info:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
