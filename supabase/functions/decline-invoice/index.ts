import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { booking_id } = await req.json();
    if (!booking_id) throw new Error("booking_id is required");

    // Update booking status to declined
    const { error: bookingError } = await supabaseClient
      .from('bookings')
      .update({ status: 'declined' })
      .eq('id', booking_id)
      .eq('user_id', user.id); // Ensure only booking owner can decline

    if (bookingError) throw bookingError;

    // Update payment status to declined if exists - skip this as it violates constraints
    // Payment status constraint only allows: pending, completed, failed, cancelled

    // Get booking details to find talent and create notification
    const { data: booking, error: fetchError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        talent_profiles (
          user_id,
          artist_name
        )
      `)
      .eq('id', booking_id)
      .single();

    if (fetchError) throw fetchError;

    // Create notification for talent if assigned
    if (booking.talent_profiles?.user_id) {
      const { error: notificationError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: booking.talent_profiles.user_id,
          type: 'invoice_declined',
          title: 'Invoice Declined',
          message: `Your invoice for the ${booking.event_type} event has been declined by the booker.`,
          booking_id: booking_id
        });

      if (notificationError) console.warn('Notification creation failed:', notificationError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in decline-invoice:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});