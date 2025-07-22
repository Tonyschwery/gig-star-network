import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-INVOICE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Invoice sending started");

    const { bookingId } = await req.json();
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }
    logStep("Received booking ID", { bookingId });

    // Use service role to bypass RLS for invoice processing
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
      currentStatus: booking.status,
      isPro: booking.talent_profiles?.is_pro_subscriber,
      rate: booking.talent_profiles?.rate_per_hour 
    });

    const talentProfile = booking.talent_profiles;
    if (!talentProfile || !talentProfile.rate_per_hour) {
      throw new Error("Talent profile or hourly rate not found");
    }

    // Calculate invoice amounts
    const hourlyRate = parseFloat(talentProfile.rate_per_hour.toString());
    const hoursBooked = booking.event_duration;
    const totalAmount = hourlyRate * hoursBooked;
    
    // Commission logic: 0% for pro talents, 10% for non-pro talents
    const commissionRate = talentProfile.is_pro_subscriber ? 0 : 10;
    const platformCommission = (totalAmount * commissionRate) / 100;
    const processingFee = 2.99; // Mock processing fee
    const talentEarnings = totalAmount - platformCommission;
    const finalAmount = totalAmount + processingFee; // What booker pays

    logStep("Calculated invoice amounts", {
      hourlyRate,
      hoursBooked,
      totalAmount,
      commissionRate,
      platformCommission,
      processingFee,
      talentEarnings,
      finalAmount
    });

    // Create payment record with pending status
    const paymentReference = `INVOICE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        booking_id: bookingId,
        booker_id: booking.user_id,
        talent_id: booking.talent_id,
        total_amount: Math.round(finalAmount * 100), // Store in cents
        platform_commission: Math.round(platformCommission * 100),
        talent_earnings: Math.round(talentEarnings * 100),
        commission_rate: commissionRate,
        hourly_rate: Math.round(hourlyRate * 100),
        hours_booked: hoursBooked,
        payment_status: 'pending', // Awaiting payment from booker
        payment_method: 'mock',
        payment_reference: paymentReference,
        currency: 'USD'
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }
    logStep("Created payment record", { paymentId: payment.id, paymentReference });

    // Update booking status to 'approved' and link to payment
    const { error: updateError } = await supabaseClient
      .from("bookings")
      .update({ 
        status: 'approved',
        payment_id: payment.id
      })
      .eq("id", bookingId);

    if (updateError) {
      throw new Error(`Failed to update booking status: ${updateError.message}`);
    }
    logStep("Updated booking status to approved with payment link");

    // Create notification for booker about the invoice with payment details
    const { error: notificationError } = await supabaseClient
      .from("notifications")
      .insert({
        user_id: booking.user_id, // Send notification to the booker
        type: 'invoice_received',
        title: 'Invoice Received - Payment Required',
        message: `${talentProfile.artist_name} has approved your ${booking.event_type} booking. Total: $${finalAmount.toFixed(2)} (${hoursBooked}h × $${hourlyRate}/h + $${processingFee.toFixed(2)} processing fee${commissionRate > 0 ? ` + ${commissionRate}% platform fee` : ''}). Click to pay and confirm your booking.`,
        booking_id: bookingId
      });

    if (notificationError) {
      logStep("Failed to create notification", { error: notificationError.message });
      // Don't throw error here, the main operation succeeded
    } else {
      logStep("Created detailed invoice notification for booker");
    }

    logStep("Invoice sending completed successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "Invoice sent to booker successfully",
      booking_status: 'approved',
      payment: {
        id: payment.id,
        total_amount: finalAmount,
        breakdown: {
          hourly_rate: hourlyRate,
          hours: hoursBooked,
          subtotal: totalAmount,
          platform_commission: platformCommission,
          processing_fee: processingFee,
          total: finalAmount
        },
        payment_reference: paymentReference,
        status: 'pending'
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in invoice sending", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});