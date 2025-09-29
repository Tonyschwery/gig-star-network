import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('CLEANUP - Starting past events cleanup at:', new Date().toISOString());
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get today's date
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0]; // Get YYYY-MM-DD format
    
    console.log('CLEANUP - Looking for events before:', todayISO);

    // Find bookings where event_date is in the past and status is not 'completed'
    const { data: pastBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, event_date, status, event_type')
      .lt('event_date', todayISO)
      .neq('status', 'completed')
      .neq('status', 'declined');

    if (fetchError) {
      console.error('CLEANUP - Error fetching past bookings:', fetchError);
      throw new Error(`Failed to fetch past bookings: ${fetchError.message}`);
    }

    console.log('CLEANUP - Found past events to delete:', pastBookings?.length || 0);

    if (pastBookings && pastBookings.length > 0) {
      // Delete these past bookings completely
      const bookingIds = pastBookings.map(booking => booking.id);
      
      console.log('CLEANUP - Deleting booking IDs:', bookingIds);

      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .in('id', bookingIds);

      if (deleteError) {
        console.error('CLEANUP - Error deleting bookings:', deleteError);
        throw new Error(`Failed to delete bookings: ${deleteError.message}`);
      }

      console.log('CLEANUP - Successfully deleted', pastBookings.length, 'past events from database');

      // Delete chat messages for completed past events
      const { error: chatCleanupError } = await supabase
        .rpc('cleanup_expired_chat_messages');

      if (chatCleanupError) {
        console.error('CLEANUP - Error cleaning up expired chat messages:', chatCleanupError);
        // Don't fail the entire function if chat cleanup fails
      } else {
        console.log('CLEANUP - Successfully cleaned up expired chat messages');
      }

      // Log details of what was deleted
      pastBookings.forEach(booking => {
        console.log(`CLEANUP - Deleted booking ${booking.id}: ${booking.event_type} on ${booking.event_date} (was ${booking.status})`);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: pastBookings?.length || 0,
        message: `Deleted ${pastBookings?.length || 0} past events from database`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('CLEANUP - CRITICAL ERROR - Cleanup failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});