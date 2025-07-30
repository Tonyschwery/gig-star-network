import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('STRIPE WEBHOOK - Webhook received at:', new Date().toISOString());
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!signature || !webhookSecret) {
      console.error('STRIPE WEBHOOK - Missing signature or webhook secret');
      throw new Error('Missing signature or webhook secret');
    }

    const body = await req.text();
    console.log('STRIPE WEBHOOK - Received body length:', body.length);

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('STRIPE WEBHOOK - Event verified:', event.type, 'ID:', event.id);
    } catch (err) {
      console.error('STRIPE WEBHOOK - Signature verification failed:', err);
      return new Response(`Webhook signature verification failed: ${err.message}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different Stripe events
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('STRIPE WEBHOOK - Processing checkout.session.completed');
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.payment_status === 'paid') {
          console.log('STRIPE WEBHOOK - Payment confirmed for session:', session.id);
          
          // Get the payment record from our database using session metadata
          const paymentId = session.metadata?.paymentId;
          
          if (!paymentId) {
            console.error('STRIPE WEBHOOK - No payment ID in session metadata');
            throw new Error('No payment ID found in session metadata');
          }

          console.log('STRIPE WEBHOOK - Found payment ID in metadata:', paymentId);

          // Call our existing process-payment function
          try {
            console.log('STRIPE WEBHOOK - Calling process-payment function for payment ID:', paymentId);
            
            const { data, error } = await supabase.functions.invoke('process-payment', {
              body: { paymentId }
            });

            if (error) {
              console.error('STRIPE WEBHOOK - CRITICAL ERROR - process-payment function failed:', error);
              throw new Error(`Process payment failed: ${error.message}`);
            }

            console.log('STRIPE WEBHOOK - process-payment function completed successfully:', data);
          } catch (processError) {
            console.error('STRIPE WEBHOOK - CRITICAL ERROR - Failed to process payment:', processError);
            throw processError;
          }
        } else {
          console.log('STRIPE WEBHOOK - Payment not completed, status:', session.payment_status);
        }
        break;

      case 'payment_intent.payment_failed':
        console.log('STRIPE WEBHOOK - Processing payment_intent.payment_failed');
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('STRIPE WEBHOOK - Payment failed for:', failedPayment.id);
        
        // Could handle failed payments here if needed
        break;

      default:
        console.log('STRIPE WEBHOOK - Unhandled event type:', event.type);
    }

    console.log('STRIPE WEBHOOK - Webhook processed successfully');
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('STRIPE WEBHOOK - CRITICAL ERROR - Webhook processing failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});