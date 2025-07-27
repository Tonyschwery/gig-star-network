import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceRequest {
  bookingId: string;
  totalAmount: number;
  currency: string;
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

    const { bookingId, totalAmount, currency }: InvoiceRequest = await req.json();

    if (!bookingId || !totalAmount || totalAmount <= 0) {
      throw new Error('Invalid booking ID or total amount');
    }

    console.log('Creating invoice for booking:', bookingId, 'amount:', totalAmount);

    // Get booking and talent details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        talent_profiles!inner(
          id,
          artist_name,
          is_pro_subscriber,
          user_id
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError);
      throw new Error('Booking not found');
    }

    // Calculate commission rates: 20% for non-pro, 10% for pro
    const isProSubscriber = booking.talent_profiles.is_pro_subscriber || false;
    const commissionRate = isProSubscriber ? 10 : 20;
    const platformCommission = (totalAmount * commissionRate) / 100;
    const talentEarnings = totalAmount - platformCommission;

    console.log('Commission calculation:', {
      isProSubscriber,
      commissionRate,
      platformCommission,
      talentEarnings
    });

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        booker_id: booking.user_id,
        talent_id: booking.talent_id,
        total_amount: totalAmount,
        platform_commission: platformCommission,
        talent_earnings: talentEarnings,
        commission_rate: commissionRate,
        currency: currency,
        payment_status: 'pending',
        payment_method: 'manual_invoice',
        hourly_rate: 0,
        hours_booked: 0
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    // Update booking with payment ID and status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'approved',
        payment_id: payment.id
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Booking update error:', updateError);
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    // Create notification for booker
    await supabase
      .from('notifications')
      .insert({
        user_id: booking.user_id,
        type: 'invoice_received',
        title: 'Invoice Received',
        message: `You have received an invoice for ${currency} ${totalAmount.toFixed(2)} from ${booking.talent_profiles.artist_name}.`,
        booking_id: bookingId
      });

    console.log('Invoice created successfully:', payment.id);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        totalAmount,
        currency,
        platformCommission,
        talentEarnings,
        commissionRate
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Invoice creation error:', error);
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