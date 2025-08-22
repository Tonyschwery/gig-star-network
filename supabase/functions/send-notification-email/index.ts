import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, data?: any) => {
  console.log(`[send-notification-email] ${step}`, data ? JSON.stringify(data, null, 2) : '');
};

serve(async (req: Request): Promise<Response> => {
  logStep('Function invoked', { method: req.method });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { 
      emailType,
      userIds,
      bookingId,
      messageId,
      paymentId,
      broadcastData,
      notificationType,
      skipPreferenceCheck = false 
    } = await req.json();

    logStep('Request parsed', { emailType, userIds, bookingId, messageId, paymentId });

    // Get admin email for admin notifications
    let adminEmail = null;
    if (emailType === 'admin' || skipPreferenceCheck) {
      const { data: adminSettings } = await supabaseAdmin
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_email')
        .single();
      
      adminEmail = adminSettings?.setting_value;
      logStep('Admin email retrieved', { adminEmail });
    }

    // Process emails for each user
    const emailPromises = [];

    for (const userId of userIds) {
      try {
        // Check user's email preferences (skip for admin notifications)
        if (!skipPreferenceCheck) {
          const { data: preferences } = await supabaseAdmin
            .from('email_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

          // Skip if user has disabled this type of notification
          if (preferences) {
            const prefKey = `${emailType}_notifications`;
            if (!preferences[prefKey]) {
              logStep(`Skipping email for user ${userId} - preference disabled`, { prefKey });
              continue;
            }
          }
        }

        // Get user profile from auth.users or talent_profiles
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!authUser.user?.email) {
          logStep(`No email found for user ${userId}`);
          continue;
        }

        const userEmail = authUser.user.email;
        let userName = authUser.user.user_metadata?.name || 'User';

        // Try to get more detailed user info from talent_profiles
        const { data: talentProfile } = await supabaseAdmin
          .from('talent_profiles')
          .select('artist_name')
          .eq('user_id', userId)
          .single();

        if (talentProfile?.artist_name) {
          userName = talentProfile.artist_name;
        }

        let emailData: any = {};

        // Prepare email data based on type
        switch (emailType) {
          case 'booking':
            if (bookingId) {
              const { data: booking } = await supabaseAdmin
                .from('bookings')
                .select(`
                  *,
                  talent_profiles!inner(artist_name, user_id)
                `)
                .eq('id', bookingId)
                .single();

              if (booking) {
                emailData = {
                  eventType: booking.event_type,
                  eventDate: booking.event_date,
                  eventLocation: booking.event_location,
                  bookerName: booking.booker_name,
                  talentName: booking.talent_profiles?.artist_name,
                  status: booking.status,
                  bookingId: booking.id,
                  isForTalent: userId === booking.talent_profiles?.user_id,
                };
              }
            }
            break;

          case 'message':
            if (messageId && bookingId) {
              const { data: message } = await supabaseAdmin
                .from('booking_messages')
                .select('message, sender_type')
                .eq('id', messageId)
                .single();

              const { data: booking } = await supabaseAdmin
                .from('bookings')
                .select(`
                  event_type,
                  event_date,
                  booker_name,
                  talent_profiles!inner(artist_name, user_id)
                `)
                .eq('id', bookingId)
                .single();

              if (message && booking) {
                const senderName = message.sender_type === 'talent' 
                  ? booking.talent_profiles?.artist_name 
                  : booking.booker_name;

                emailData = {
                  senderName,
                  eventType: booking.event_type,
                  eventDate: booking.event_date,
                  messagePreview: message.message.substring(0, 100) + (message.message.length > 100 ? '...' : ''),
                  bookingId,
                  isFromTalent: message.sender_type === 'talent',
                };
              }
            }
            break;

          case 'payment':
            if (paymentId || bookingId) {
              const { data: payment } = await supabaseAdmin
                .from('payments')
                .select(`
                  *,
                  bookings!inner(
                    event_type,
                    event_date,
                    booker_name,
                    talent_profiles!inner(artist_name, user_id)
                  )
                `)
                .eq(paymentId ? 'id' : 'booking_id', paymentId || bookingId)
                .single();

              if (payment) {
                emailData = {
                  eventType: payment.bookings.event_type,
                  eventDate: payment.bookings.event_date,
                  totalAmount: payment.total_amount,
                  currency: payment.currency,
                  bookingId: payment.booking_id,
                  isForTalent: userId === payment.bookings.talent_profiles?.user_id,
                  talentEarnings: payment.talent_earnings,
                  platformCommission: payment.platform_commission,
                };
              }
            }
            break;

          case 'broadcast':
            if (broadcastData) {
              emailData = {
                message: broadcastData.message,
                recipientType: broadcastData.recipientType,
              };
            }
            break;
        }

        // Send email via send-email function
        const emailPromise = supabaseAdmin.functions.invoke('send-email', {
          body: {
            type: emailType,
            recipientEmail: userEmail,
            recipientName: userName,
            data: emailData,
          },
        });

        emailPromises.push(emailPromise);
        logStep(`Email queued for user ${userId}`, { userEmail, userName });

      } catch (userError) {
        logStep(`Error processing user ${userId}`, { error: userError.message });
      }
    }

    // Send admin notification if needed
    if (emailType === 'admin' && adminEmail && notificationType) {
      let adminEmailData: any = { notificationType };

      // Get additional data for admin notification
      if (bookingId) {
        const { data: booking } = await supabaseAdmin
          .from('bookings')
          .select(`
            *,
            talent_profiles!inner(artist_name, user_id)
          `)
          .eq('id', bookingId)
          .single();

        if (booking) {
          adminEmailData = {
            ...adminEmailData,
            eventType: booking.event_type,
            eventDate: booking.event_date,
            eventLocation: booking.event_location,
            bookerName: booking.booker_name,
            talentName: booking.talent_profiles?.artist_name,
            bookingId: booking.id,
          };
        }
      }

      if (paymentId) {
        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select(`
            *,
            bookings!inner(
              event_type,
              booker_name,
              talent_profiles!inner(artist_name)
            )
          `)
          .eq('id', paymentId)
          .single();

        if (payment) {
          adminEmailData = {
            ...adminEmailData,
            amount: payment.total_amount,
            currency: payment.currency,
            bookerName: payment.bookings.booker_name,
            talentName: payment.bookings.talent_profiles?.artist_name,
          };
        }
      }

      const adminEmailPromise = supabaseAdmin.functions.invoke('send-email', {
        body: {
          type: 'admin',
          recipientEmail: adminEmail,
          recipientName: 'Admin',
          data: adminEmailData,
        },
      });

      emailPromises.push(adminEmailPromise);
      logStep('Admin email queued', { adminEmail });
    }

    // Wait for all emails to be sent
    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logStep('Email sending completed', { successful, failed, total: results.length });

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: successful,
        emailsFailed: failed,
        totalEmails: results.length 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    logStep('Error in send-notification-email function', { error: error.message });
    console.error('Error in send-notification-email function:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});