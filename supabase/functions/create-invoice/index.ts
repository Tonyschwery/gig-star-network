import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRequest {
  id: string; // Can be booking_id or gig_application_id
  type: 'booking' | 'gig'; // Type to determine data source
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
    const { id, type, total_amount, currency, platform_commission, talent_earnings, commission_rate, hourly_rate, hours_booked, booking_id } = invoiceData;

    // Handle backward compatibility - if booking_id is provided but not id/type
    const recordId = id || booking_id;
    const recordType = type || 'booking';

    // Validate required fields
    if (!recordId || !total_amount || total_amount <= 0) {
      throw new Error("Missing or invalid required fields");
    }

    console.log(`Creating invoice for ${recordType}:`, recordId);

    // Step A: Get record details based on type
    let recordData;
    if (recordType === 'booking') {
      const { data: booking, error: bookingFetchError } = await supabaseService
        .from("bookings")
        .select("*, talent_id")
        .eq("id", recordId)
        .single();

      if (bookingFetchError) {
        console.error("Error fetching booking:", bookingFetchError);
        throw new Error("Failed to fetch booking details");
      }

      if (!booking.talent_id) {
        throw new Error("No talent assigned to this booking");
      }

      recordData = booking;
    } else if (recordType === 'gig') {
      // For gigs, the id is a gig_application_id, not the booking id
      const { data: gigApplication, error: gigAppError } = await supabaseService
        .from("gig_applications")
        .select("*, gig_id, talent_id")
        .eq("id", recordId)
        .single();

      if (gigAppError) {
        console.error("Error fetching gig application:", gigAppError);
        throw new Error("Failed to fetch gig application details");
      }

      // Get the actual gig data from bookings table
      const { data: gig, error: gigFetchError } = await supabaseService
        .from("bookings")
        .select("*")
        .eq("id", gigApplication.gig_id)
        .eq("is_gig_opportunity", true)
        .eq("is_public_request", true)
        .single();

      if (gigFetchError) {
        console.error("Error fetching gig:", gigFetchError);
        throw new Error("Failed to fetch gig details");
      }

      // Combine gig data with application data
      recordData = { 
        ...gig, 
        talent_id: gigApplication.talent_id,
        gig_application_id: gigApplication.id
      };
    } else {
      throw new Error("Invalid type. Must be 'booking' or 'gig'");
    }

    console.log(`Found ${recordType} with talent_id:`, recordData.talent_id);

    // Step B: Insert payment record with correct talent_id
    const { data: payment, error: paymentError } = await supabaseService
      .from("payments")
      .insert({
        booking_id: recordType === 'gig' ? recordData.gig_id : recordId, // Use gig_id for gigs, booking_id for bookings
        booker_id: recordData.user_id,
        talent_id: recordData.talent_id, // Use actual talent_id from record
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

    // Step C: Update record status and link payment
    if (recordType === 'gig') {
      // Update gig application status
      const { error: gigAppUpdateError } = await supabaseService
        .from("gig_applications")
        .update({
          status: "invoice_sent"
        })
        .eq("id", recordId);

      if (gigAppUpdateError) {
        console.error("Error updating gig application:", gigAppUpdateError);
        throw new Error("Failed to update gig application status");
      }

      // Update the original gig booking
      const { error: gigUpdateError } = await supabaseService
        .from("bookings")
        .update({
          status: "approved",
          payment_id: payment.id,
          talent_id: recordData.talent_id // Assign talent to the gig
        })
        .eq("id", recordData.gig_id);

      if (gigUpdateError) {
        console.error("Error updating gig:", gigUpdateError);
        throw new Error("Failed to update gig status");
      }
    } else {
      const { error: recordUpdateError } = await supabaseService
        .from("bookings")
        .update({
          status: "approved",
          payment_id: payment.id
        })
        .eq("id", recordId);

      if (recordUpdateError) {
        console.error("Error updating booking:", recordUpdateError);
        throw new Error("Failed to update booking status");
      }
    }

    console.log(`Updated ${recordType} status to approved`);

    // Step D: Create notification for booker
    const { error: notificationError } = await supabaseService
      .from("notifications")
      .insert({
        user_id: recordData.user_id,
        type: "invoice_received",
        title: "Invoice Received",
        message: `You have received an invoice for your ${recordData.event_type} ${recordType === 'gig' ? 'gig' : 'event'}. Please review and complete payment.`,
        booking_id: recordType === 'gig' ? recordData.gig_id : recordId
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