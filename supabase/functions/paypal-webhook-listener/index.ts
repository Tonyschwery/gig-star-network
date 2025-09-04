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

    // Get PayPal credentials
    const paypalClientId = Deno.env.get('PAYPAL_LIVE_CLIENT_ID');
    const paypalClientSecret = Deno.env.get('PAYPAL_LIVE_CLIENT_SECRET');
    const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');

    if (!paypalClientId || !paypalClientSecret || !webhookId) {
      console.error('Missing PayPal credentials');
      return new Response(JSON.stringify({ error: 'Missing PayPal credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the webhook event
    const webhookEvent: PayPalWebhookEvent = await req.json();
    console.log('Received webhook event:', webhookEvent.event_type, 'ID:', webhookEvent.id);

    // Get PayPal access token for verification
    const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
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

    // Verify webhook signature for security
    console.log('Verifying PayPal webhook signature...');
    const verificationPayload = {
      transmission_id: req.headers.get('PAYPAL-TRANSMISSION-ID'),
      cert_id: req.headers.get('PAYPAL-CERT-ID'),
      auth_algo: req.headers.get('PAYPAL-AUTH-ALGO'),
      transmission_time: req.headers.get('PAYPAL-TRANSMISSION-TIME'),
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    };

    const verifyResponse = await fetch('https://api-m.paypal.com/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify(verificationPayload),
    });

    if (!verifyResponse.ok) {
      console.error('Webhook verification failed:', await verifyResponse.text());
      return new Response(JSON.stringify({ error: 'Webhook verification failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verificationResult: PayPalWebhookVerificationResponse = await verifyResponse.json();
    if (verificationResult.verification_status !== 'SUCCESS') {
      console.error('Webhook signature invalid:', verificationResult);
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Webhook verification successful');

    // Process subscription webhook events - ONLY when payment is actually made
    if (webhookEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' || 
        webhookEvent.event_type === 'PAYMENT.SALE.COMPLETED') {
      
      const subscription = webhookEvent.resource;
      console.log('Processing subscription event:', webhookEvent.event_type, 'ID:', subscription.id);

      // Extract user ID from custom_id field
      const customId = subscription.custom_id;
      if (!customId) {
        console.error('No custom_id found in subscription');
        return new Response(JSON.stringify({ error: 'No user ID found in subscription' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Updating subscription for user:', customId);

      // Determine subscription period based on plan_id
      let periodEndDate = new Date();
      if (subscription.plan_id?.includes('monthly') || subscription.plan_id?.includes('P-5DD48036RS5113705NCY45IY')) {
        // Monthly plan - 30 days
        periodEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else {
        // Yearly plan - 365 days
        periodEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      // Update user's subscription status in talent_profiles
      const { data, error } = await supabase
        .from('talent_profiles')
        .update({
          subscription_status: 'active',
          paypal_subscription_id: subscription.id,
          plan_id: subscription.plan_id || 'basic_plan',
          current_period_end: periodEndDate.toISOString(),
          is_pro_subscriber: true,
          subscription_started_at: new Date().toISOString(),
        })
        .eq('user_id', customId);

      if (error) {
        console.error('Failed to update talent profile:', error);
        return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Successfully updated subscription for user:', customId);

      // Create notification for the user with better messaging
      await supabase
        .from('notifications')
        .insert({
          user_id: customId,
          type: 'subscription_activated',
          title: 'Pro Subscription Activated! 🎉',
          message: 'Welcome to Pro! You can now upload up to 10 photos, add SoundCloud & YouTube links, get priority listing, and enjoy unlimited bookings. Click to start enhancing your profile!'
        });

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});