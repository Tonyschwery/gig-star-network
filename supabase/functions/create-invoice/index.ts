// Force redeploy - 2025-07-31 - Updated to use pending_approval status
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRequest {
  id: string; // booking_id
  total_amount: number;
  currency: string;
  platform_commission: number;
  talent_earnings: number;
  commission_rate: number;
  hourly_rate: number;
  hours_booked: number;
  // Legacy field for backward compatibility
  booking_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL DEBUG: Log all incoming request data
    console.log("=== CREATE-INVOICE FUNCTION CALLED ===");
    console.log("Request method:", req.method);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    
    // Parse and log the request body first
    const requestBody = await req.text();
    console.log("Raw request body:", requestBody);
    
    let invoiceData: InvoiceRequest;
    try {
      invoiceData = JSON.parse(requestBody);
      console.log("Parsed invoice data:", invoiceData);
    } catch (parseError) {
      console.error("CRITICAL ERROR: Failed to parse request body as JSON:", parseError);
      throw new Error("Invalid JSON in request body");
    }
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

    // Verify authorization header is present (basic validation)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("No valid authorization header");
    }

    console.log("Authorization header validated");

    // Extract data from already parsed request body
    const { id, total_amount, currency, platform_commission, talent_earnings, commission_rate, hourly_rate, hours_booked, booking_id } = invoiceData;

    // Handle backward compatibility - if booking_id is provided but not id
    const bookingId = id || booking_id;

    // Validate required fields
    if (!bookingId || !total_amount || total_amount <= 0) {
      throw new Error("Missing or invalid required fields");
    }

    console.log("Creating invoice for booking:", bookingId);

    // Get booking details
    const { data: booking, error: bookingFetchError } = await supabaseService
      .from("bookings")
      .select("*, talent_id")
      .eq("id", bookingId)
      .single();

    if (bookingFetchError) {
      console.error("Error fetching booking:", bookingFetchError);
      throw new Error("Failed to fetch booking details");
    }

    if (!booking.talent_id) {
      throw new Error("No talent assigned to this booking");
    }

    console.log("Found booking with talent_id:", booking.talent_id);

    // Create payment record
    console.log("Creating payment record with data:", {
      booking_id: bookingId,
      booker_id: booking.user_id,
      talent_id: booking.talent_id,
      total_amount: total_amount,
      currency: currency || "USD"
    });

    const paymentData = {
      booking_id: bookingId,
      booker_id: booking.user_id,
      talent_id: booking.talent_id,
      total_amount: total_amount,
      platform_commission: platform_commission,
      talent_earnings: talent_earnings,
      commission_rate: commission_rate,
      hourly_rate: hourly_rate,
      hours_booked: hours_booked,
      currency: currency || "USD",
      payment_status: "pending",
      payment_method: "manual_invoice"
    };

    console.log("DEBUG: Data for payments insert:", paymentData);

    const { data: payment, error: paymentError } = await supabaseService
      .from("payments")
      .upsert(paymentData, { onConflict: 'booking_id,payment_method' })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating payment:", paymentError);
      throw new Error("Failed to create payment record");
    }

    console.log("Created payment record:", payment.id);

    // Update booking status to pending_approval (payment record already links via booking_id)
    const { error: bookingUpdateError } = await supabaseService
      .from("bookings")
      .update({
        status: "pending_approval"
      })
      .eq("id", bookingId);

    if (bookingUpdateError) {
      console.error("Error updating booking:", bookingUpdateError);
      throw new Error("Failed to update booking status");
    }

    console.log("Updated booking status to pending_approval");

    // Create notification for booker
    const { error: notificationError } = await supabaseService
      .from("notifications")
      .insert({
        user_id: booking.user_id,
        type: "invoice_received",
        title: "Invoice Received",
        message: `You have received an invoice for your ${booking.event_type} event. Please review and complete payment.`,
        booking_id: bookingId
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
    // CRITICAL ERROR LOGGING as requested
    console.error('CRITICAL ERROR in create-invoice:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : String(error)) || "Failed to create invoice"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});