import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceRequest {
  bookingId: string;
  agreedPrice: number;
  currency: string;
  platformCommissionRate?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { bookingId, agreedPrice, currency, platformCommissionRate = 20 }: InvoiceRequest = await req.json();

    if (!bookingId || !agreedPrice || agreedPrice <= 0) {
      throw new Error('Invalid booking ID or agreed price');
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*, talent_profiles(artist_name, is_pro_subscriber)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Calculate payment amounts
    const totalAmount = Number(agreedPrice);
    const isProSubscriber = booking.talent_profiles?.is_pro_subscriber || false;
    const commissionRate = isProSubscriber ? 15 : 20;
    const platformCommission = (totalAmount * commissionRate) / 100;
    const talentEarnings = totalAmount - platformCommission;

    // Create or update payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .upsert({
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
      }, {
        onConflict: 'booking_id,payment_method'
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    // Update booking status to approved
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'approved',
        payment_id: payment.id
      })
      .eq('id', bookingId);

    if (updateError) {
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    // Create notification
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: booking.user_id,
        type: 'invoice_received',
        title: 'Invoice Received',
        message: `You have received an invoice for ${currency} ${totalAmount.toFixed(2)} from ${booking.talent_profiles?.artist_name || 'the talent'}.`,
        booking_id: bookingId
      });

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: payment.id,
          totalAmount,
          currency,
          platformCommission,
          talentEarnings
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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