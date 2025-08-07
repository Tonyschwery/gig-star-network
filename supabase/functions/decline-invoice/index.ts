import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { booking_id } = await req.json();

    if (!booking_id) {
      throw new Error('Booking ID is required');
    }

    console.log('Declining invoice for booking:', booking_id, 'by user:', user.id);

    // MASTER TASK 2: Reset booking status to 'pending' when invoice is declined
    const { data: booking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'pending' })
      .eq('id', booking_id)
      .eq('user_id', user.id) // Ensure user owns this booking
      .select(`
        *,
        talent_profiles (
          user_id,
          artist_name
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating booking status:', updateError);
      throw new Error('Failed to decline invoice');
    }

    if (!booking) {
      throw new Error('Booking not found or unauthorized');
    }

    console.log('Booking status reset to pending:', booking);

    // Create notification for talent
    if (booking.talent_profiles?.user_id) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: booking.talent_profiles.user_id,
          type: 'invoice_declined',
          title: 'Invoice Declined',
          message: `The booker has declined your invoice for the ${booking.event_type} event. You can send a new invoice.`,
          booking_id: booking.id
        });

      console.log('Notification sent to talent about declined invoice');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invoice declined successfully',
        booking_id: booking.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in decline-invoice function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});