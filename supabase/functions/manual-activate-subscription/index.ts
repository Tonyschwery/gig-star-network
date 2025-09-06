import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse request body
    const { user_id, subscription_id, plan_id } = await req.json();
    
    console.log('Manual activation request:', { user_id, subscription_id, plan_id });

    if (!user_id || !subscription_id || !plan_id) {
      throw new Error('Missing required parameters: user_id, subscription_id, plan_id');
    }

    // Determine subscription period
    let subscriptionPeriod = 'monthly';
    if (plan_id.includes('yearly') || plan_id.includes('annual')) {
      subscriptionPeriod = 'yearly';
    }

    // Calculate subscription end date
    const now = new Date();
    const subscriptionEnd = new Date();
    if (subscriptionPeriod === 'yearly') {
      subscriptionEnd.setFullYear(now.getFullYear() + 1);
    } else {
      subscriptionEnd.setMonth(now.getMonth() + 1);
    }

    // Update talent profile
    const { data: updateData, error: updateError } = await supabaseServiceRole
      .from('talent_profiles')
      .update({
        is_pro_subscriber: true,
        subscription_status: 'active',
        plan_id: plan_id,
        paypal_subscription_id: subscription_id,
        current_period_end: subscriptionEnd.toISOString(),
        subscription_started_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('user_id', user_id)
      .select();

    if (updateError) {
      console.error('Error updating talent profile:', updateError);
      throw new Error(`Failed to update talent profile: ${updateError.message}`);
    }

    console.log('Talent profile updated successfully:', updateData);

    // Create success notification
    const { error: notificationError } = await supabaseServiceRole
      .from('notifications')
      .insert({
        user_id: user_id,
        type: 'subscription_activated',
        title: 'Pro Subscription Activated',
        message: `Your ${subscriptionPeriod} Pro subscription has been successfully activated! Welcome to QTalents Pro.`,
        created_at: now.toISOString()
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription activated successfully',
        subscription_period: subscriptionPeriod,
        subscription_end: subscriptionEnd.toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in manual activation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});