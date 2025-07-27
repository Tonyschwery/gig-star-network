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

    let finalTalentId = booking.talent_id;

    // If this is a gig opportunity without an assigned talent, we need to assign the current user as the talent
    if (!booking.talent_id && booking.is_public_request && booking.is_gig_opportunity) {
      logStep('Gig opportunity without talent - attempting to assign talent from request context');
      
      // Get the current user from the JWT token
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        throw new Error('No authorization header found');
      }

      const token = authHeader.replace('Bearer ', '');
      
      if (!token || token.trim() === '') {
        throw new Error('Invalid or empty authorization token');
      }
      
      // Decode the JWT to get the user ID (simple decode, not verification since we're in a secure context)
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid JWT token format');
        }
        const payload = JSON.parse(atob(tokenParts[1]));
        var userId = payload.sub;
      } catch (error) {
        logStep('Error parsing JWT token', { token: token.substring(0, 20) + '...', error });
        throw new Error('Failed to parse authorization token');
      }
      
      if (!userId) {
        throw new Error('No user ID found in token');
      }

      logStep('Found user ID from token', { userId });

      // Get the talent profile for this user
      const { data: talentProfile, error: talentError } = await supabaseAdmin
        .from('talent_profiles')
        .select('id, artist_name, user_id, is_pro_subscriber')
        .eq('user_id', userId)
        .maybeSingle();

      if (talentError) {
        logStep('Error fetching talent profile', talentError);
        throw new Error(`Failed to fetch talent profile: ${talentError.message}`);
      }

      if (!talentProfile) {
        logStep('No talent profile found for user', { userId });
        throw new Error('Talent profile not found for the current user');
      }

      logStep('Found talent profile', { talentId: talentProfile.id, artistName: talentProfile.artist_name });

      // Assign this talent to the booking in a transaction
      const { data: updatedBooking, error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ talent_id: talentProfile.id })
        .eq('id', bookingId)
        .is('talent_id', null) // Only update if still unassigned
        .select()
        .single();

      if (updateError) {
        logStep('Error assigning talent to booking', updateError);
        throw new Error(`Failed to assign talent to booking: ${updateError.message}`);
      }

      if (!updatedBooking) {
        logStep('Booking assignment failed - likely already claimed by another talent');
        throw new Error('This gig opportunity has already been claimed by another talent');
      }

      finalTalentId = talentProfile.id;
      logStep('Successfully assigned talent to booking', { 
        bookingId, 
        talentId: finalTalentId,
        artistName: talentProfile.artist_name 
      });

      // Use the talent profile we already have
      var assignedTalentProfile = talentProfile;
    } else if (booking.talent_id) {
      // Get talent profile for existing assignment
      logStep('Fetching talent profile for existing assignment');
      const { data: existingTalentProfile, error: existingTalentError } = await supabaseAdmin
        .from('talent_profiles')
        .select('id, artist_name, user_id, is_pro_subscriber')
        .eq('id', booking.talent_id)
        .single();

      if (existingTalentError) {
        logStep('Error fetching existing talent profile', existingTalentError);
        throw new Error(`Failed to fetch talent profile: ${existingTalentError.message}`);
      }

      var assignedTalentProfile = existingTalentProfile;
      logStep('Found existing talent assignment', { 
        talentId: assignedTalentProfile.id,
        artistName: assignedTalentProfile.artist_name 
      });
    } else {
      logStep('No talent assigned and not a gig opportunity', { 
        bookingId,
        talentId: booking.talent_id,
        isPublicRequest: booking.is_public_request,
        isGigOpportunity: booking.is_gig_opportunity 
      });
      throw new Error('No talent assigned to this booking');
    }

    logStep('Booking and talent details retrieved', {
      bookingId: booking.id,
      talentId: assignedTalentProfile.id,
      booker: booking.user_id,
      artistName: assignedTalentProfile.artist_name
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
        talent_id: assignedTalentProfile.id,
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
        payment_id: payment.id
      })
      .eq('id', bookingId);

    if (updateError) {
      logStep('Error updating booking', updateError);
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    // Create notification for the booker - with user validation
    logStep('Creating notification for booker');
    
    // First verify the user exists in auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(booking.user_id);
    
    if (authError || !authUser) {
      logStep('Warning: User not found in auth.users, skipping notification', { 
        userId: booking.user_id, 
        error: authError?.message 
      });
    } else {
      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: booking.user_id,
          type: 'invoice_received',
          title: 'Invoice Received',
          message: `${assignedTalentProfile.artist_name} has sent you an invoice for ${currency || 'USD'} ${totalAmount.toFixed(2)} for your ${booking.event_type} event.`,
          booking_id: bookingId
        });

      if (notificationError) {
        logStep('Error creating notification', notificationError);
        // Don't throw error for notification failure, just log it
        console.warn('Failed to create notification:', notificationError);
      } else {
        logStep('Notification created successfully');
      }
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