// Force redeploy - 2025-07-31 - Updated to use pending_approval status
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

    // Extract data from already parsed request body
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
      // Step 1: First query gig_applications to get gig_id and talent_id
      console.log("Step 1: Fetching gig application data for ID:", recordId);
      const { data: gigApplication, error: gigAppError } = await supabaseService
        .from("gig_applications")
        .select("gig_id, talent_id, id")
        .eq("id", recordId)
        .single();

      if (gigAppError) {
        console.error("Error fetching gig application:", gigAppError);
        throw new Error("Failed to fetch gig application details");
      }

      if (!gigApplication) {
        console.error("No gig application found for ID:", recordId);
        throw new Error("Gig application not found");
      }

      console.log("Found gig application:", {
        gig_id: gigApplication.gig_id,
        talent_id: gigApplication.talent_id,
        application_id: gigApplication.id
      });

      // Step 2: Query the bookings table using gig_id to get booker_id and budget
      console.log("Step 2: Fetching gig data for gig_id:", gigApplication.gig_id);
      const { data: gig, error: gigFetchError } = await supabaseService
        .from("bookings")
        .select("id, user_id, event_type, budget, budget_currency, event_date, event_location, description")
        .eq("id", gigApplication.gig_id)
        .eq("is_gig_opportunity", true)
        .eq("is_public_request", true)
        .single();

      if (gigFetchError) {
        console.error("Error fetching gig:", gigFetchError);
        throw new Error("Failed to fetch gig details");
      }

      if (!gig) {
        console.error("No gig found for ID:", gigApplication.gig_id);
        throw new Error("Gig not found");
      }

      console.log("Found gig data:", {
        gig_id: gig.id,
        booker_id: gig.user_id,
        budget: gig.budget,
        currency: gig.budget_currency
      });

      // Step 3: Combine all the data for payment creation
      recordData = { 
        ...gig, 
        talent_id: gigApplication.talent_id,
        gig_application_id: gigApplication.id,
        gig_id: gigApplication.gig_id
      };

      console.log("Combined record data prepared:", {
        booking_id: recordData.gig_id,
        booker_id: recordData.user_id,
        talent_id: recordData.talent_id
      });
    } else {
      throw new Error("Invalid type. Must be 'booking' or 'gig'");
    }

    console.log(`Found ${recordType} with talent_id:`, recordData.talent_id);

    // Step B: Insert payment record with correct talent_id
    console.log("Step B: Creating payment record with data:", {
      booking_id: recordType === 'gig' ? recordData.gig_id : recordId,
      booker_id: recordData.user_id,
      talent_id: recordData.talent_id,
      total_amount: total_amount,
      currency: currency || "USD"
    });

    const paymentData = {
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
          status: "pending_approval",
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
          status: "pending_approval",
          payment_id: payment.id
        })
        .eq("id", recordId);

      if (recordUpdateError) {
        console.error("Error updating booking:", recordUpdateError);
        throw new Error("Failed to update booking status");
      }
    }

    console.log(`Updated ${recordType} status to pending_approval`);

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

    // MASTER TASK 1: Create conversation for gig applications after successful invoice creation
    if (recordType === 'gig') {
      console.log("TASK 1: Creating conversation for gig application:", recordId);
      
      // Check if conversation already exists
      const { data: existingConversation, error: conversationCheckError } = await supabaseService
        .from('conversations')
        .select('id')
        .eq('gig_application_id', recordId)
        .maybeSingle();

      if (conversationCheckError) {
        console.error("Error checking for existing conversation:", conversationCheckError);
        // Don't throw here as main process succeeded
      } else if (!existingConversation) {
        // Create new conversation
        const { data: newConversation, error: createConversationError } = await supabaseService
          .from('conversations')
          .insert({
            booking_id: recordData.gig_id,
            gig_application_id: recordId
          })
          .select('id')
          .single();

        if (createConversationError) {
          console.error("Error creating conversation:", createConversationError);
          // Don't throw here as main process succeeded
        } else {
          console.log("TASK 1 SUCCESS: Created conversation for gig application:", newConversation.id);
        }
      } else {
        console.log("TASK 1: Conversation already exists for gig application");
      }
    }

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
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
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