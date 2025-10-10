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

    const requestBody = await req.json();
    const { 
      emailType,
      userIds,
      emailData,
      bookingId,
      messageId,
      paymentId,
      broadcastData,
      notificationType,
      eventRequestId,
      adminEmail,
      skipPreferenceCheck = false 
    } = requestBody;

    // Extract IDs from emailData if they exist there
    const actualBookingId = bookingId || emailData?.booking_id;
    const actualMessageId = messageId || emailData?.message_id;
    const actualPaymentId = paymentId || emailData?.payment_id;
    const actualEventRequestId = eventRequestId || emailData?.event_request_id;

    logStep('Request parsed', requestBody);

    // Validate userIds is an array (unless it's admin_support_message which sends directly to admin)
    if (emailType !== 'admin_support_message' && !Array.isArray(userIds)) {
      throw new Error(`userIds must be an array, received: ${typeof userIds}`);
    }

    // Use hardcoded admin email unless provided in request
    const adminEmailAddress = adminEmail || 'qtalentslive@gmail.com';
    logStep('Using admin email', { adminEmailAddress });

    // Handle admin_support_message separately (sent directly to admin email)
    if (emailType === 'admin_support_message') {
      const adminEmailPromise = supabaseAdmin.functions.invoke('send-email', {
        body: {
          type: emailType,
          recipientEmail: adminEmailAddress,
          data: emailData,
        },
      });

      const results = await Promise.allSettled([adminEmailPromise]);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logStep('Admin support email sent', { successful, failed });

      return new Response(
        JSON.stringify({ 
          success: true, 
          emailsSent: successful,
          emailsFailed: failed,
          totalEmails: 1 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
          case 'booking_request_talent':
            if (actualBookingId) {
              const { data: booking } = await supabaseAdmin
                .from('bookings')
                .select(`
                  *,
                  talent_profiles!inner(artist_name, user_id, is_pro_subscriber)
                `)
                .eq('id', actualBookingId)
                .single();

              if (booking) {
                const isForTalent = userId === booking.talent_profiles?.user_id;
                const talentIsProSubscriber = booking.talent_profiles?.is_pro_subscriber;
                const isAdmin = (await supabaseAdmin.rpc('is_admin', { user_id_param: userId })).data;
                
                // For non-pro talents, check if they've already received >= 1 booking request this month
                let shouldBlurDetails = false;
                if (isForTalent && !talentIsProSubscriber && booking.talent_profiles) {
                  try {
                    // Get current month's booking request count (total received, not just accepted)
                    const currentMonthStart = new Date();
                    currentMonthStart.setDate(1);
                    currentMonthStart.setHours(0, 0, 0, 0);
                    
                    const { data: bookingsThisMonth } = await supabaseAdmin
                      .from('bookings')
                      .select('id')
                      .eq('talent_id', booking.talent_id)
                      .gte('created_at', currentMonthStart.toISOString());
                    
                    const totalRequestsThisMonth = bookingsThisMonth?.length || 0;
                    shouldBlurDetails = totalRequestsThisMonth >= 2; // Blur from 2nd request onwards
                  } catch (error) {
                    console.error('Error checking talent booking requests:', error);
                  }
                }
                
                // Determine if user should see full details 
                // Admin always sees all, Pro talents see all, non-pro talents see details for first request only
                const showFullDetails = isAdmin || (isForTalent && talentIsProSubscriber) || (isForTalent && !shouldBlurDetails);
                
                // Base email data (always included) - using template-expected field names
                emailData = {
                  event_type: booking.event_type,
                  event_date: booking.event_date,
                  event_location: booking.event_location,
                  booker_name: booking.booker_name,
                  talent_name: booking.talent_profiles?.artist_name,
                  status: booking.status,
                  booking_id: booking.id,
                  isForTalent,
                  is_pro_subscriber: talentIsProSubscriber,
                  showFullDetails,
                  event_duration: booking.event_duration,
                };

                // Add sensitive details only for admin and pro talents
                if (showFullDetails) {
                  emailData.booker_email = booking.booker_email;
                  emailData.booker_phone = booking.booker_phone;
                  emailData.description = booking.description;
                  emailData.budget = booking.budget;
                  emailData.budget_currency = booking.budget_currency;
                  emailData.event_address = booking.event_address;
                }
              }
            }
            break;

          case 'message':
            if (actualMessageId && actualBookingId) {
              const { data: message } = await supabaseAdmin
                .from('chat_messages')
                .select('content, sender_id')
                .eq('id', actualMessageId)
                .maybeSingle();

              const { data: booking } = await supabaseAdmin
                .from('bookings')
                .select(`
                  event_type,
                  event_date,
                  booker_name,
                  user_id,
                  talent_profiles!inner(artist_name, user_id)
                `)
                .eq('id', actualBookingId)
                .maybeSingle();

              if (message && booking && booking.talent_profiles && !Array.isArray(booking.talent_profiles)) {
                const talentProfile = booking.talent_profiles as { artist_name: string; user_id: string };
                const isFromTalent = message.sender_id === talentProfile.user_id;
                const senderName = isFromTalent 
                  ? talentProfile.artist_name 
                  : booking.booker_name;

                emailData = {
                  senderName,
                  eventType: booking.event_type,
                  eventDate: booking.event_date,
                  messagePreview: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
                  bookingId: actualBookingId,
                  isFromTalent,
                };
              }
            }
            break;

          case 'payment':
            if (actualPaymentId || actualBookingId) {
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
                .eq(actualPaymentId ? 'id' : 'booking_id', actualPaymentId || actualBookingId)
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
            
          case 'event_request_confirmation':
            if (actualEventRequestId) {
              const { data: eventRequest } = await supabaseAdmin
                .from('event_requests')
                .select('*')
                .eq('id', actualEventRequestId)
                .single();

              if (eventRequest) {
                emailData = {
                  eventData: eventRequest
                };
              }
            }
            break;
        }

        // Send email via send-email function
        const emailPromise = supabaseAdmin.functions.invoke('send-email', {
          body: {
            type: emailType,
            recipientEmail: userEmail,
            data: {
              ...emailData,
              recipient_name: userName
            },
          },
        });

        emailPromises.push(emailPromise);
        logStep(`Email queued for user ${userId}`, { userEmail, userName });

      } catch (userError) {
        logStep(`Error processing user ${userId}`, { error: userError instanceof Error ? userError.message : String(userError) });
      }
    }

    // Send admin notification for admin email types
    if (emailType.startsWith('admin_') && emailType !== 'admin_support_message' && adminEmailAddress) {
      let adminEmailData: any = { ...emailData };

      // If emailData already contains the necessary data (from frontend), use it directly
      if (emailData && Object.keys(emailData).length > 0) {
        adminEmailData = { ...emailData };
      }

      // Get additional data for admin notification only if not provided
      if (actualBookingId && !adminEmailData.booking_id) {
        const { data: booking } = await supabaseAdmin
          .from('bookings')
          .select(`
            *,
            talent_profiles!inner(artist_name, user_id)
          `)
          .eq('id', actualBookingId)
          .single();

        if (booking) {
          // Get booker user details
          const { data: bookerUser } = await supabaseAdmin.auth.admin.getUserById(booking.user_id);
          
          // Get talent email if talent is assigned
          let talentEmail = null;
          if (booking.talent_profiles?.user_id) {
            try {
              const { data: talentUser } = await supabaseAdmin.auth.admin.getUserById(booking.talent_profiles.user_id);
              talentEmail = talentUser?.user?.email || null;
            } catch (error) {
              logStep('Error fetching talent user', { error: error instanceof Error ? error.message : String(error) });
            }
          }
          
          adminEmailData = {
            ...adminEmailData,
            booking_id: booking.id,
            booker_name: booking.booker_name,
            booker_email: booking.booker_email || bookerUser?.user?.email,
            booker_phone: booking.booker_phone,
            talent_name: booking.talent_profiles?.artist_name,
            talent_email: talentEmail,
            event_type: booking.event_type,
            event_date: booking.event_date,
            event_duration: booking.event_duration,
            event_location: booking.event_location,
            description: booking.description,
            budget: booking.budget,
            budget_currency: booking.budget_currency,
            status: booking.status,
          };
        }
      }

      // Handle event requests (indirect requests) only if not provided
      if (actualEventRequestId && !adminEmailData.event_type) {
        const { data: eventRequest } = await supabaseAdmin
          .from('event_requests')
          .select('*')
          .eq('id', actualEventRequestId)
          .single();

        if (eventRequest) {
          // Get user details for event request
          const { data: requesterUser } = await supabaseAdmin.auth.admin.getUserById(eventRequest.user_id);
          
          adminEmailData = {
            ...adminEmailData,
            booker_name: eventRequest.booker_name,
            booker_email: eventRequest.booker_email,
            booker_phone: eventRequest.booker_phone,
            event_type: eventRequest.event_type,
            event_date: eventRequest.event_date,
            event_duration: eventRequest.event_duration,
            event_location: eventRequest.event_location,
            description: eventRequest.description,
          };
        }
      }

      if (actualPaymentId) {
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
          .eq('id', actualPaymentId)
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
          type: emailType,
          recipientEmail: adminEmailAddress,
          data: {
            ...adminEmailData,
            recipient_name: 'Admin'
          },
        },
      });

      emailPromises.push(adminEmailPromise);
      logStep('Admin email queued', { adminEmailAddress });
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