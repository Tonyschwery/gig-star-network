import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[Process Payment] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting payment processing');
    
    const { paymentId, successUrl, cancelUrl } = await req.json();
    
    logStep('Request data received', { paymentId, successUrl, cancelUrl });
    
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get payment details
    logStep('Fetching payment details');
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        bookings (
          event_type,
          event_date,
          talent_profiles (
            artist_name
          )
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      logStep('Error fetching payment', paymentError);
      throw new Error('Payment not found');
    }

    logStep('Payment details retrieved', {
      paymentId: payment.id,
      amount: payment.total_amount,
      currency: payment.currency,
      status: payment.payment_status
    });

    // For demo purposes, create a mock Stripe session URL
    // In production, this would create an actual Stripe checkout session
    const mockStripeUrl = `https://checkout.stripe.com/demo?session_id=cs_demo_${paymentId}&amount=${payment.total_amount * 100}&currency=${payment.currency.toLowerCase()}`;
    
    logStep('Mock Stripe session created', { url: mockStripeUrl });

    // In a real implementation, you would:
    // 1. Create a Stripe checkout session
    // 2. Return the session URL
    // 3. Handle webhook to update payment status when completed

    // For demo, we'll simulate the payment flow
    setTimeout(async () => {
      // Simulate payment completion after 30 seconds (for demo)
      try {
        await supabaseAdmin
          .from('payments')
          .update({
            payment_status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', paymentId);
        
        logStep('Demo payment marked as completed');
      } catch (error) {
        logStep('Error updating demo payment', error);
      }
    }, 30000);

    return new Response(
      JSON.stringify({
        success: true,
        url: mockStripeUrl,
        message: 'Redirecting to payment processor (demo mode)'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logStep('Error in payment processing', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});