import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalWebhookVerificationResponse {
  verification_status: string;
}

interface PayPalSubscription {
  id: string;
  status: string;
  plan_id: string;
  custom_id?: string;
  subscriber?: {
    email_address?: string;
  };
  billing_info?: {
    next_billing_time?: string;
    cycle_executions?: Array<{
      tenure_type: string;
      sequence: number;
      cycles_completed: number;
    }>;
  };
}

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  summary: string;
  resource: PayPalSubscription;
  create_time: string;
}

serve(async (req) => {
  console.log('PayPal webhook received:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get PayPal credentials - try live first, then sandbox as fallback
    let paypalClientId = Deno.env.get('PAYPAL_LIVE_CLIENT_ID');
    let paypalClientSecret = Deno.env.get('PAYPAL_LIVE_CLIENT_SECRET');
    let isLiveMode = true;
    
    // Fallback to sandbox if live credentials not available
    if (!paypalClientId || !paypalClientSecret) {
      paypalClientId = Deno.env.get('PAYPAL_SANDBOX_CLIENT_ID');
      paypalClientSecret = Deno.env.get('PAYPAL_SANDBOX_CLIENT_SECRET');
      isLiveMode = false;
    }
    
    const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
    
    console.log('PayPal Environment:', isLiveMode ? 'LIVE' : 'SANDBOX');
    console.log('Client ID available:', !!paypalClientId);
    console.log('Client Secret available:', !!paypalClientSecret);
    console.log('Webhook ID available:', !!webhookId);

    if (!paypalClientId || !paypalClientSecret) {
      console.error('Missing PayPal credentials - neither live nor sandbox credentials found');
      return new Response(JSON.stringify({ error: 'Missing PayPal credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the webhook event
    const webhookEvent: PayPalWebhookEvent = await req.json();
    console.log('=== PAYPAL WEBHOOK DEBUG ===');
    console.log('Event Type:', webhookEvent.event_type);
    console.log('Event ID:', webhookEvent.id);
    console.log('Full PayPal Payload:', JSON.stringify(webhookEvent, null, 2));
    console.log('Resource Object:', JSON.stringify(webhookEvent.resource, null, 2));

    // Get PayPal access token for verification (use correct API endpoint)
    const paypalApiUrl = isLiveMode ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
    console.log('Fetching PayPal access token from:', paypalApiUrl);
    
    const tokenResponse = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      console.error('Failed to get PayPal access token:', await tokenResponse.text());
      return new Response(JSON.stringify({ error: 'PayPal authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData: PayPalAccessTokenResponse = await tokenResponse.json();

    // Verify webhook signature for security (skip if no webhook ID for testing)
    if (webhookId) {
      console.log('Verifying PayPal webhook signature...');
      const verificationPayload = {
        transmission_id: req.headers.get('PAYPAL-TRANSMISSION-ID'),
        cert_id: req.headers.get('PAYPAL-CERT-ID'),
        auth_algo: req.headers.get('PAYPAL-AUTH-ALGO'),
        transmission_time: req.headers.get('PAYPAL-TRANSMISSION-TIME'),
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      };

      const verifyResponse = await fetch(`${paypalApiUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify(verificationPayload),
      });

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.error('Webhook verification API call failed:', errorText);
        return new Response(JSON.stringify({ error: 'Webhook verification failed' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const verificationResult: PayPalWebhookVerificationResponse = await verifyResponse.json();
      console.log('Webhook verification result:', verificationResult);

      if (verificationResult.verification_status !== 'SUCCESS') {
        console.error('Webhook signature invalid:', verificationResult);
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.log('Skipping webhook verification (no webhook ID provided)');
    }

    console.log('Webhook processing continuing...');

    // Process subscription webhook events - Handle multiple event types for live mode
    console.log('=== CHECKING EVENT TYPE ===');
    console.log('Event type received:', webhookEvent.event_type);
    
    if (webhookEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' || 
        webhookEvent.event_type === 'PAYMENT.SUBSCRIPTION.ACTIVATED' ||
        webhookEvent.event_type === 'PAYMENT.SALE.COMPLETED' ||
        webhookEvent.event_type.includes('SUBSCRIPTION.ACTIVATED')) {
      
      const subscription = webhookEvent.resource;
      console.log('=== PROCESSING SUBSCRIPTION EVENT ===');
      console.log('Event Type:', webhookEvent.event_type);
      console.log('Subscription ID:', subscription.id);
      console.log('Subscription Status:', subscription.status);
      console.log('Plan ID:', subscription.plan_id);

      // Extract user ID - check multiple possible locations
      let customId = subscription.custom_id;
      
      // For PAYMENT.SALE.COMPLETED events, custom_id is in resource.custom field
      if (!customId && (subscription as any).custom) {
        customId = (subscription as any).custom;
        console.log('Found custom_id in resource.custom field:', customId);
      }
      
      // Try alternative locations for custom_id in live mode
      if (!customId && subscription.subscriber?.email_address) {
        // Sometimes custom_id is in different location
        customId = (subscription as any).subscriber?.custom_id;
      }
      
      // Try application_context or other nested locations
      if (!customId && (subscription as any).application_context) {
        customId = (subscription as any).application_context.custom_id;
      }

      console.log('=== CUSTOM ID EXTRACTION ===');
      console.log('Found custom_id:', customId);
      console.log('Subscriber info:', JSON.stringify(subscription.subscriber, null, 2));
      
      if (!customId) {
        console.error('=== ERROR: No custom_id found ===');
        console.error('Full subscription object:', JSON.stringify(subscription, null, 2));
        return new Response(JSON.stringify({ 
          error: 'No user ID found in subscription',
          event_type: webhookEvent.event_type,
          subscription_id: subscription.id 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('=== SUBSCRIPTION UPDATE PROCESS ===');
      console.log('Updating subscription for user ID:', customId);

      // First verify user exists in talent_profiles
      const { data: existingProfile, error: checkError } = await supabase
        .from('talent_profiles')
        .select('id, user_id, artist_name')
        .eq('user_id', customId)
        .single();

      console.log('=== USER VERIFICATION ===');
      console.log('User lookup result:', existingProfile);
      console.log('User lookup error:', checkError);

      if (checkError || !existingProfile) {
        console.error('=== ERROR: User not found in talent_profiles ===');
        console.error('Searched for user_id:', customId);
        console.error('Error details:', checkError);
        return new Response(JSON.stringify({ 
          error: 'User profile not found',
          user_id: customId,
          check_error: checkError?.message 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Determine subscription period based on plan_id
      let periodEndDate = new Date();
      const planId = subscription.plan_id || '';
      
      console.log('=== PLAN DETECTION ===');
      console.log('Plan ID received:', planId);
      
      if (planId.includes('monthly') || planId.includes('P-5DD48036RS5113705NCY45IY') || planId.toLowerCase().includes('month')) {
        // Monthly plan - 30 days
        periodEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        console.log('Detected: Monthly plan');
      } else {
        // Yearly plan - 365 days
        periodEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        console.log('Detected: Yearly plan');
      }

      console.log('Subscription period end date:', periodEndDate.toISOString());

      // Update user's subscription status in talent_profiles
      const updateData = {
        subscription_status: 'active',
        paypal_subscription_id: subscription.id,
        plan_id: planId || 'basic_plan',
        current_period_end: periodEndDate.toISOString(),
        is_pro_subscriber: true,
        subscription_started_at: new Date().toISOString(),
        will_renew: true,
        cancelled_at: null,
        cancellation_reason: null
      };

      console.log('=== SUPABASE UPDATE ===');
      console.log('Update data:', JSON.stringify(updateData, null, 2));

      const { data, error } = await supabase
        .from('talent_profiles')
        .update(updateData)
        .eq('user_id', customId)
        .select();

      console.log('=== UPDATE RESULT ===');
      console.log('Update success data:', data);
      console.log('Update error:', error);

      if (error) {
        console.error('=== ERROR: Failed to update talent profile ===');
        console.error('Error details:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to update subscription',
          supabase_error: error.message,
          user_id: customId 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('=== SUCCESS: Subscription activated successfully ===');
      console.log('Updated user:', customId);
      console.log('Subscription ID:', subscription.id);

      // Create notification for the user
      const notificationResult = await supabase
        .from('notifications')
        .insert({
          user_id: customId,
          type: 'subscription_activated',
          title: 'Pro Subscription Activated! 🎉',
          message: 'Welcome to Pro! You can now upload up to 10 photos, add SoundCloud & YouTube links, get priority listing, and enjoy unlimited bookings. Click to start enhancing your profile!'
        });

      console.log('Notification created:', notificationResult.error ? 'Failed' : 'Success');

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Subscription activated successfully',
        user_id: customId,
        subscription_id: subscription.id,
        event_type: webhookEvent.event_type
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle subscription cancellation
    if (webhookEvent.event_type === 'BILLING.SUBSCRIPTION.CANCELLED') {
      const subscription = webhookEvent.resource;
      console.log('=== PROCESSING SUBSCRIPTION CANCELLATION ===');
      console.log('Subscription ID:', subscription.id);

      // Find user by paypal_subscription_id
      const { data: profile, error: findError } = await supabase
        .from('talent_profiles')
        .select('user_id, artist_name')
        .eq('paypal_subscription_id', subscription.id)
        .single();

      if (findError || !profile) {
        console.error('User profile not found for subscription:', subscription.id);
        return new Response(JSON.stringify({ 
          error: 'User profile not found',
          subscription_id: subscription.id 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update subscription to cancelled
      const { error: updateError } = await supabase
        .from('talent_profiles')
        .update({
          subscription_status: 'cancelled',
          is_pro_subscriber: false,
          cancelled_at: new Date().toISOString(),
        })
        .eq('paypal_subscription_id', subscription.id);

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
        return new Response(JSON.stringify({ 
          error: 'Failed to cancel subscription',
          supabase_error: updateError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: profile.user_id,
          type: 'subscription_cancelled',
          title: 'Subscription Cancelled',
          message: 'Your Pro subscription has been cancelled. You will retain Pro features until the end of your billing period.'
        });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Subscription cancelled successfully',
        subscription_id: subscription.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle subscription updates
    if (webhookEvent.event_type === 'BILLING.SUBSCRIPTION.UPDATED') {
      const subscription = webhookEvent.resource;
      console.log('=== PROCESSING SUBSCRIPTION UPDATE ===');
      console.log('Subscription ID:', subscription.id);
      console.log('New Status:', subscription.status);

      // Find user by paypal_subscription_id
      const { data: profile, error: findError } = await supabase
        .from('talent_profiles')
        .select('user_id')
        .eq('paypal_subscription_id', subscription.id)
        .single();

      if (findError || !profile) {
        console.error('User profile not found for subscription:', subscription.id);
        return new Response(JSON.stringify({ 
          error: 'User profile not found',
          subscription_id: subscription.id 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Determine new period end if billing info available
      let periodEndDate = null;
      if (subscription.billing_info?.next_billing_time) {
        periodEndDate = subscription.billing_info.next_billing_time;
      }

      // Update subscription details
      const updateData: any = {
        subscription_status: subscription.status === 'ACTIVE' ? 'active' : subscription.status.toLowerCase(),
      };

      if (periodEndDate) {
        updateData.current_period_end = periodEndDate;
      }

      const { error: updateError } = await supabase
        .from('talent_profiles')
        .update(updateData)
        .eq('paypal_subscription_id', subscription.id);

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
        return new Response(JSON.stringify({ 
          error: 'Failed to update subscription',
          supabase_error: updateError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Subscription updated successfully',
        subscription_id: subscription.id,
        new_status: subscription.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle payment denied
    if (webhookEvent.event_type === 'PAYMENT.SALE.DENIED') {
      console.log('=== PROCESSING PAYMENT DENIED ===');
      const resource = webhookEvent.resource as any;
      const subscriptionId = resource.billing_agreement_id;

      if (subscriptionId) {
        // Find user by paypal_subscription_id
        const { data: profile, error: findError } = await supabase
          .from('talent_profiles')
          .select('user_id, artist_name')
          .eq('paypal_subscription_id', subscriptionId)
          .single();

        if (profile && !findError) {
          // Create notification for payment failure
          await supabase
            .from('notifications')
            .insert({
              user_id: profile.user_id,
              type: 'payment_failed',
              title: 'Payment Failed',
              message: 'Your subscription payment was declined. Please update your payment method to continue your Pro subscription.'
            });

          console.log('Payment denied notification sent to user:', profile.user_id);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Payment denial processed',
        subscription_id: subscriptionId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Event type not handled:', webhookEvent.event_type);

    // Return success for unhandled but valid events
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Event received but not processed',
      event_type: webhookEvent.event_type 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});