import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[Send Manual Invoice] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting manual invoice process');
    
    const { bookingId, agreedPrice, currency, platformCommissionRate } = await req.json();
    
    logStep('Request data received', { bookingId, agreedPrice, currency, platformCommissionRate });
    
    if (!bookingId || !agreedPrice || agreedPrice <= 0) {
      const errorMsg = 'Missing required fields: bookingId and agreedPrice must be provided and agreedPrice must be > 0';
      logStep('Validation error', { bookingId, agreedPrice });
      throw new Error(errorMsg);
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get booking details first
    logStep('Fetching booking details');
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError) {
      logStep('Error fetching booking', bookingError);
      throw new Error(`Failed to fetch booking: ${bookingError.message}`);
    }

    if (!booking) {
      logStep('Booking not found', { bookingId });
      throw new Error('Booking not found');
    }

    if (!booking.talent_id) {
      logStep('No talent assigned to booking - this might be a gig opportunity that needs to be claimed first', { 
        bookingId,
        talentId: booking.talent_id,
        isPublicRequest: booking.is_public_request,
        isGigOpportunity: booking.is_gig_opportunity 
      });
      throw new Error('No talent assigned to this booking yet. For gig opportunities, please claim the gig first by starting a chat.');
    }

    // Get talent profile separately
    logStep('Fetching talent profile');
    const { data: talentProfile, error: talentError } = await supabaseAdmin
      .from('talent_profiles')
      .select('id, artist_name, user_id, is_pro_subscriber')
      .eq('id', booking.talent_id)
      .single();

    if (talentError) {
      logStep('Error fetching talent profile', talentError);
      throw new Error(`Failed to fetch talent profile: ${talentError.message}`);
    }

    if (!talentProfile) {
      logStep('Talent profile not found', { talentId: booking.talent_id });
      throw new Error('Talent profile not found');
    }

    logStep('Booking and talent details retrieved', {
      bookingId: booking.id,
      talentId: talentProfile.id,
      booker: booking.user_id,
      artistName: talentProfile.artist_name
    });

    // Calculate amounts
    const totalAmount = parseFloat(agreedPrice.toString());
    const commissionRate = platformCommissionRate || 15; // Default to 15%
    const platformCommission = (totalAmount * commissionRate) / 100;
    const talentEarnings = totalAmount - platformCommission;

    logStep('Amount calculations', {
      totalAmount,
      commissionRate,
      platformCommission,
      talentEarnings
    });

    // Create payment record
    logStep('Creating payment record');
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        booking_id: bookingId,
        booker_id: booking.user_id,
        talent_id: talentProfile.id,
        total_amount: totalAmount,
        platform_commission: platformCommission,
        talent_earnings: talentEarnings,
        commission_rate: commissionRate,
        hourly_rate: 0, // Not applicable for manual pricing
        hours_booked: 0, // Not applicable for manual pricing
        currency: currency || 'USD',
        payment_status: 'pending',
        payment_method: 'manual_invoice'
      })
      .select()
      .single();

    if (paymentError) {
      logStep('Error creating payment record', paymentError);
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    logStep('Payment record created', payment);

    // Update booking status and link payment
    logStep('Updating booking status');
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'approved',
        payment_id: payment.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      logStep('Error updating booking', updateError);
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    // Create notification for the booker
    logStep('Creating notification for booker');
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: booking.user_id,
        type: 'invoice_received',
        title: 'Invoice Received',
        message: `${talentProfile.artist_name} has sent you an invoice for ${currency || 'USD'} ${totalAmount.toFixed(2)} for your ${booking.event_type} event.`,
        booking_id: bookingId
      });

    if (notificationError) {
      logStep('Error creating notification', notificationError);
      // Don't throw error for notification failure, just log it
      console.warn('Failed to create notification:', notificationError);
    }

    logStep('Manual invoice process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Manual invoice sent successfully',
        payment: {
          id: payment.id,
          totalAmount,
          currency: currency || 'USD',
          platformCommission,
          talentEarnings
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logStep('Error in manual invoice process', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});