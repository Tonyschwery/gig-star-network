import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting cleanup of expired bookings and event requests...')

    // Call the cleanup functions
    const { error: bookingsError } = await supabaseAdmin.rpc('cleanup_expired_bookings')
    if (bookingsError) {
      console.error('Error cleaning up expired bookings:', bookingsError)
      throw bookingsError
    }

    const { error: eventRequestsError } = await supabaseAdmin.rpc('cleanup_expired_event_requests')
    if (eventRequestsError) {
      console.error('Error cleaning up expired event requests:', eventRequestsError)
      throw eventRequestsError
    }

    console.log('Successfully cleaned up expired bookings and event requests')

    return new Response(
      JSON.stringify({ success: true, message: 'Expired bookings and event requests cleaned up successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in cleanup function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})