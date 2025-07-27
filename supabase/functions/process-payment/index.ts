import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  paymentId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId }: PaymentRequest = await req.json();

    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    console.log('Processing payment:', paymentId);

    // Get payment and related booking details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        bookings!inner(
          id,
          user_id,
          talent_id,
          event_type,
          talent_profiles!inner(
            artist_name,
            user_id
          )
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('Payment fetch error:', paymentError);
      throw new Error('Payment not found');
    }

    if (payment.payment_status === 'completed') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment already completed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment status to completed
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        payment_status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (paymentUpdateError) {
      console.error('Payment update error:', paymentUpdateError);
      throw new Error(`Failed to update payment: ${paymentUpdateError.message}`);
    }

    // Update booking status to completed
    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed'
      })
      .eq('id', payment.booking_id);

    if (bookingUpdateError) {
      console.error('Booking update error:', bookingUpdateError);
      throw new Error(`Failed to update booking: ${bookingUpdateError.message}`);
    }

    // Create notifications
    const notifications = [];

    // Notification for booker
    notifications.push({
      user_id: payment.bookings.user_id,
      type: 'payment_completed',
      title: 'Payment Completed',
      message: `Your payment of ${payment.currency} ${payment.total_amount} has been processed successfully.`,
      booking_id: payment.booking_id
    });

    // Notification for talent
    if (payment.bookings.talent_profiles?.user_id) {
      notifications.push({
        user_id: payment.bookings.talent_profiles.user_id,
        type: 'payment_received',
        title: 'Payment Received',
        message: `You have received payment of ${payment.currency} ${payment.talent_earnings} for your ${payment.bookings.event_type} booking.`,
        booking_id: payment.booking_id
      });
    }

    if (notifications.length > 0) {
      await supabase
        .from('notifications')
        .insert(notifications);
    }

    console.log('Payment processed successfully:', paymentId);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId,
        totalAmount: payment.total_amount,
        talentEarnings: payment.talent_earnings,
        currency: payment.currency
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});