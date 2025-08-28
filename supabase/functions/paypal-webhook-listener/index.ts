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

interface PayPalOrder {
  id: string;
  status: string;
  purchase_units: Array<{
    custom_id?: string;
    reference_id?: string;
  }>;
}

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  summary: string;
  resource: PayPalOrder;
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
    const paypalClientId = Deno.env.get('PAYPAL_SANDBOX_CLIENT_ID');
    const paypalClientSecret = Deno.env.get('PAYPAL_SANDBOX_CLIENT_SECRET');
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
    const tokenResponse = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
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

    // Verify webhook authenticity
    const verificationPayload = {
      transmission_id: req.headers.get('PAYPAL-TRANSMISSION-ID'),
      cert_id: req.headers.get('PAYPAL-CERT-ID'),
      auth_algo: req.headers.get('PAYPAL-AUTH-ALGO'),
      transmission_time: req.headers.get('PAYPAL-TRANSMISSION-TIME'),
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    };

    const verificationResponse = await fetch('https://api.sandbox.paypal.com/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationPayload),
    });

    if (!verificationResponse.ok) {
      console.error('Webhook verification failed:', await verificationResponse.text());
      return new Response(JSON.stringify({ error: 'Webhook verification failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verificationResult: PayPalWebhookVerificationResponse = await verificationResponse.json();

    if (verificationResult.verification_status !== 'SUCCESS') {
      console.error('Webhook verification status not SUCCESS:', verificationResult.verification_status);
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Webhook verified successfully');

    // Process the webhook event
    if (webhookEvent.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const order = webhookEvent.resource;
      console.log('Processing order approval:', order.id);

      // Extract user ID from custom_id field
      const customId = order.purchase_units?.[0]?.custom_id;
      if (!customId) {
        console.error('No custom_id found in order');
        return new Response(JSON.stringify({ error: 'No user ID found in order' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Updating subscription for user:', customId);

      // Update user's subscription status in talent_profiles
      const { data, error } = await supabase
        .from('talent_profiles')
        .update({
          subscription_status: 'active',
          paypal_subscription_id: order.id,
          plan_id: order.purchase_units?.[0]?.reference_id || 'basic_plan',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
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

      // Create notification for the user
      await supabase
        .from('notifications')
        .insert({
          user_id: customId,
          type: 'subscription_activated',
          title: 'Subscription Activated',
          message: 'Your Pro subscription has been successfully activated!'
        });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Subscription activated successfully',
        user_id: customId,
        order_id: order.id 
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