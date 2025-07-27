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
    
    const { paymentId } = await req.json();
    
    logStep('Request data received', { paymentId });
    
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

    // Get payment details with booking info
    logStep('Fetching payment details');
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        bookings (
          id,
          event_type,
          event_date,
          user_id,
          talent_id,
          talent_profiles (
            artist_name,
            user_id
          )
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      logStep('Error fetching payment', paymentError);
      throw new Error('Payment not found');
    }

    // Check if payment is already completed
    if (payment.payment_status === 'completed') {
      logStep('Payment already completed');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment already completed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    logStep('Payment details retrieved', {
      paymentId: payment.id,
      amount: payment.total_amount,
      currency: payment.currency,
      status: payment.payment_status
    });

    // Process payment instantly (manual invoice system)
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        payment_status: 'completed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (updateError) {
      logStep('Error updating payment status', updateError);
      throw new Error('Failed to process payment');
    }

    // Update booking status to completed
    const { error: bookingUpdateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.bookings.id);

    if (bookingUpdateError) {
      logStep('Error updating booking status', bookingUpdateError);
      // Don't throw error, payment is already processed
    }

    // Create notifications
    const booking = payment.bookings;
    
    // Notify booker
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: booking.user_id,
        type: 'payment_completed',
        title: 'Payment Completed',
        message: `Your payment of ${payment.currency} ${payment.total_amount.toFixed(2)} has been processed successfully. Your booking is confirmed!`,
        booking_id: booking.id
      });

    // Notify talent if assigned
    if (booking.talent_id && booking.talent_profiles?.user_id) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: booking.talent_profiles.user_id,
          type: 'payment_completed',
          title: 'Payment Received',
          message: `Payment of ${payment.currency} ${payment.talent_earnings.toFixed(2)} has been received for your ${booking.event_type} event.`,
          booking_id: booking.id
        });
    }

    logStep('Payment processed successfully', {
      paymentId: payment.id,
      bookingId: booking.id,
      amount: payment.total_amount
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment processed successfully',
        payment: {
          id: payment.id,
          status: 'completed',
          amount: payment.total_amount,
          currency: payment.currency
        }
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