import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting payment processing');
    
    const { paymentId, bookingId } = await req.json();
    
    if (!paymentId && !bookingId) {
      throw new Error('Either paymentId or bookingId is required');
    }

    logStep('Request data', { paymentId, bookingId });

    // Initialize Supabase client with service role key for admin operations
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

    let payment;
    
    if (paymentId) {
      // Get payment details by payment ID
      logStep('Fetching payment by ID');
      const { data: paymentData, error: paymentError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (paymentError) {
        logStep('Error fetching payment', paymentError);
        throw new Error(`Failed to fetch payment: ${paymentError.message}`);
      }
      
      payment = paymentData;
    } else {
      // Get payment details by booking ID
      logStep('Fetching payment by booking ID');
      const { data: paymentData, error: paymentError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('payment_status', 'pending')
        .single();

      if (paymentError) {
        logStep('Error fetching payment', paymentError);
        throw new Error(`Failed to fetch payment: ${paymentError.message}`);
      }
      
      payment = paymentData;
    }

    if (!payment) {
      throw new Error('Payment record not found');
    }

    logStep('Payment details retrieved', {
      paymentId: payment.id,
      bookingId: payment.booking_id,
      amount: payment.total_amount,
      status: payment.payment_status
    });

    // Check if payment is already completed
    if (payment.payment_status === 'completed') {
      logStep('Payment already completed');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment was already completed',
          payment: {
            id: payment.id,
            status: 'completed',
            amount: payment.total_amount
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Simulate payment processing (in real app, this would integrate with Stripe, PayPal, etc.)
    logStep('Processing mock payment');
    
    // Update payment status to completed
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        payment_status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updateError) {
      logStep('Error updating payment status', updateError);
      throw new Error(`Failed to update payment status: ${updateError.message}`);
    }

    logStep('Payment status updated to completed');

    // Update booking status to completed (removes from all dashboards)
    const { error: bookingUpdateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'completed'
      })
      .eq('id', payment.booking_id);

    if (bookingUpdateError) {
      logStep('Error updating booking status', bookingUpdateError);
      // Don't throw error here, payment was successful
    }

    // Get booking and talent details for notifications
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        talent_profiles (
          artist_name,
          user_id
        )
      `)
      .eq('id', payment.booking_id)
      .single();

    if (bookingError) {
      logStep('Error fetching booking details', bookingError);
      // Don't throw error here, payment was successful
    } else {
      // Create notifications for both booker and talent
      logStep('Creating notifications');
      
      // Notification for booker
      const { error: bookerNotificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: payment.booker_id,
          type: 'payment_completed',
          title: 'Payment Successful',
          message: `Your payment of ${payment.currency} ${payment.total_amount.toFixed(2)} for the ${booking.event_type} event has been processed successfully. Your booking is now confirmed!`,
          booking_id: payment.booking_id
        });

      if (bookerNotificationError) {
        logStep('Error creating booker notification', bookerNotificationError);
      }

      // Notification for talent
      if (booking.talent_profiles?.user_id) {
        const { error: talentNotificationError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: booking.talent_profiles.user_id,
            type: 'payment_received',
            title: 'Payment Received',
            message: `Payment of ${payment.currency} ${payment.total_amount.toFixed(2)} has been received for your ${booking.event_type} event. Your earnings: ${payment.currency} ${payment.talent_earnings.toFixed(2)}.`,
            booking_id: payment.booking_id
          });

        if (talentNotificationError) {
          logStep('Error creating talent notification', talentNotificationError);
        }
      }
    }

    logStep('Payment processing completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment processed successfully',
        payment: {
          id: payment.id,
          status: 'completed',
          amount: payment.total_amount,
          currency: payment.currency,
          processed_at: new Date().toISOString(),
          booking_id: payment.booking_id
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