import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRequest {
  booking_id: string;
  total_amount: number;
  currency: string;
  platform_commission: number;
  talent_earnings: number;
  commission_rate: number;
  hourly_rate: number;
  hours_booked: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for elevated privileges
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Create regular client for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    // Parse request body
    const invoiceData: InvoiceRequest = await req.json();
    const { booking_id, total_amount, currency, platform_commission, talent_earnings, commission_rate, hourly_rate, hours_booked } = invoiceData;

    // Validate required fields
    if (!booking_id || !total_amount || total_amount <= 0) {
      throw new Error("Missing or invalid required fields");
    }

    console.log("Creating invoice for booking:", booking_id);

    // Step A: Get booking details and talent_id
    const { data: booking, error: bookingFetchError } = await supabaseService
      .from("bookings")
      .select("*, talent_id")
      .eq("id", booking_id)
      .single();

    if (bookingFetchError) {
      console.error("Error fetching booking:", bookingFetchError);
      throw new Error("Failed to fetch booking details");
    }

    if (!booking.talent_id) {
      throw new Error("No talent assigned to this booking");
    }

    console.log("Found booking with talent_id:", booking.talent_id);

    // Step B: Insert payment record with correct talent_id
    const { data: payment, error: paymentError } = await supabaseService
      .from("payments")
      .insert({
        booking_id: booking_id,
        booker_id: booking.user_id,
        talent_id: booking.talent_id, // ✅ FIXED: Use actual talent_id from booking
        total_amount: total_amount,
        platform_commission: platform_commission,
        talent_earnings: talent_earnings,
        commission_rate: commission_rate,
        hourly_rate: hourly_rate,
        hours_booked: hours_booked,
        currency: currency || "USD",
        payment_status: "pending",
        payment_method: "manual_invoice"
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating payment:", paymentError);
      throw new Error("Failed to create payment record");
    }

    console.log("Created payment record:", payment.id);

    // Step C: Update booking status and link payment
    const { error: bookingUpdateError } = await supabaseService
      .from("bookings")
      .update({
        status: "approved",
        payment_id: payment.id
      })
      .eq("id", booking_id);

    if (bookingUpdateError) {
      console.error("Error updating booking:", bookingUpdateError);
      throw new Error("Failed to update booking status");
    }

    console.log("Updated booking status to approved");

    // Step D: Create notification for booker
    const { error: notificationError } = await supabaseService
      .from("notifications")
      .insert({
        user_id: booking.user_id,
        type: "invoice_received",
        title: "Invoice Received",
        message: `You have received an invoice for your ${booking.event_type} event. Please review and complete payment.`,
        booking_id: booking_id
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Don't throw here as the main process succeeded
    }

    console.log("Created notification for booker");

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        message: "Invoice created successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in create-invoice function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to create invoice"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});