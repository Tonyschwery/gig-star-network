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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Payment processing started");

    const { bookingId } = await req.json();
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }
    logStep("Received booking ID", { bookingId });

    // Use service role to bypass RLS for payment processing
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get booking details with talent profile
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        talent_profiles (
          rate_per_hour,
          is_pro_subscriber,
          artist_name,
          user_id
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Failed to fetch booking: ${bookingError?.message}`);
    }
    logStep("Fetched booking details", { 
      bookingId: booking.id, 
      isPro: booking.talent_profiles?.is_pro_subscriber,
      rate: booking.talent_profiles?.rate_per_hour 
    });

    const talentProfile = booking.talent_profiles;
    if (!talentProfile || !talentProfile.rate_per_hour) {
      throw new Error("Talent profile or hourly rate not found");
    }

    // Calculate payment amounts
    const hourlyRate = parseFloat(talentProfile.rate_per_hour.toString());
    const hoursBooked = booking.event_duration;
    const totalAmount = hourlyRate * hoursBooked;
    
    // Commission logic: 0% for pro talents, 10% for non-pro talents
    const commissionRate = talentProfile.is_pro_subscriber ? 0 : 10;
    const platformCommission = (totalAmount * commissionRate) / 100;
    const talentEarnings = totalAmount - platformCommission;

    logStep("Calculated payment amounts", {
      hourlyRate,
      hoursBooked,
      totalAmount,
      commissionRate,
      platformCommission,
      talentEarnings
    });

    // Create payment record
    const paymentReference = `MOCK_PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        booking_id: bookingId,
        booker_id: booking.user_id,
        talent_id: booking.talent_id,
        total_amount: totalAmount,
        platform_commission: platformCommission,
        talent_earnings: talentEarnings,
        commission_rate: commissionRate,
        hourly_rate: hourlyRate,
        hours_booked: hoursBooked,
        payment_status: 'completed', // Mock payment always succeeds
        payment_method: 'mock',
        payment_reference: paymentReference,
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }
    logStep("Created payment record", { paymentId: payment.id });

    // Update booking with payment_id and status
    const { error: updateError } = await supabaseClient
      .from("bookings")
      .update({ 
        payment_id: payment.id,
        status: 'confirmed' // Booking is confirmed after payment
      })
      .eq("id", bookingId);

    if (updateError) {
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }
    logStep("Updated booking status");

    // Create notification for talent about payment received
    const { error: notificationError } = await supabaseClient
      .from("notifications")
      .insert({
        user_id: talentProfile.user_id,
        type: 'payment_received',
        title: 'Payment Received',
        message: `You've received $${talentEarnings.toFixed(2)} for your ${booking.event_type} gig${commissionRate > 0 ? ` (${commissionRate}% platform fee deducted)` : ' (no fees - pro member!)'}`,
        booking_id: bookingId
      });

    if (notificationError) {
      logStep("Failed to create notification", { error: notificationError.message });
    }

    logStep("Payment processing completed successfully");

    return new Response(JSON.stringify({
      success: true,
      payment: {
        id: payment.id,
        total_amount: totalAmount,
        platform_commission: platformCommission,
        talent_earnings: talentEarnings,
        commission_rate: commissionRate,
        payment_reference: paymentReference
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in payment processing", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});