import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { generateBookingEmailHtml, generateMessageEmailHtml, generatePaymentEmailHtml, generateBroadcastEmailHtml, generateAdminEmailHtml, generateEventRequestConfirmationEmailHtml, generateAdminSupportMessageEmailHtml } from './email-templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, data?: any) => {
  console.log(`[send-email] ${step}`, data ? JSON.stringify(data, null, 2) : '');
};

serve(async (req: Request): Promise<Response> => {
  logStep('Function invoked', { method: req.method });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if RESEND_API_KEY is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('[send-email] RESEND_API_KEY available:', !!resendApiKey);
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    // Initialize Resend client
    const resend = new Resend(resendApiKey);

    const requestBody = await req.json();
    const { type, recipientEmail, data, logId } = requestBody;

    logStep('Request parsed', { type, recipientEmail, hasData: !!data });

    let emailHtml: string;
    let subject: string;
    const appUrl = 'https://qtalent.live';

    // Update email log status to processing
    if (logId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase
          .from('email_logs')
          .update({ status: 'processing' })
          .eq('id', logId);
      } catch (logError) {
        console.log('Failed to update email log status:', logError);
      }
    }

    // Handle new email types from database triggers
    switch (type) {
      // User signup emails
      case 'user_signup_welcome':
        emailHtml = `
          <h1>Welcome to Qtalent.live!</h1>
          <p>Hello ${data.recipient_name || 'there'},</p>
          <p>Welcome to our talent marketplace! We're excited to have you join our community.</p>
          <p>Your account has been created successfully. You can now:</p>
          <ul>
            <li>Browse and book talented performers for your events</li>
            <li>Connect with amazing artists in your area</li>
            <li>Manage your bookings through your dashboard</li>
          </ul>
          <p><a href="${appUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Explore Talents</a></p>
          <p>Best regards,<br>The Qtalent Team</p>
        `;
        subject = 'Welcome to Qtalent.live!';
        break;

      case 'talent_welcome':
        emailHtml = `
          <h1>Congratulations! Your Talent Profile is Now Live</h1>
          <p>Hello ${data.artist_name || 'Talented Artist'},</p>
          <p>Your talent profile has been successfully created and is now live on Qtalent.live!</p>
          <p>You can now:</p>
          <ul>
            <li>Receive booking requests from event organizers</li>
            <li>Manage your availability and rates</li>
            <li>Build your reputation with reviews</li>
            <li>Grow your performance business</li>
          </ul>
          <p><a href="${appUrl}/talent-dashboard" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
          <p>Best of luck with your performances!<br>The Qtalent Team</p>
        `;
        subject = 'Congratulations! Your Talent Profile is Now Live';
        break;

      // Admin notifications
      case 'admin_user_signup':
        emailHtml = `
          <h1>New User Signup</h1>
          <p>A new user has signed up for Qtalent!</p>
          <h2>User Details:</h2>
          <ul>
            <li><strong>Name:</strong> ${data.user_name || 'Not provided'}</li>
            <li><strong>Email:</strong> ${data.user_email || 'Not provided'}</li>
            <li><strong>User ID:</strong> ${data.user_id || 'Not provided'}</li>
            <li><strong>Signup Date:</strong> ${data.signup_date ? new Date(data.signup_date).toLocaleDateString() : 'Unknown'}</li>
          </ul>
          <p><a href="${appUrl}/admin/users">Manage Users</a></p>
        `;
        subject = 'New User Signup on Qtalent';
        break;

      case 'admin_talent_created':
        emailHtml = `
          <h1>New Talent Profile Created</h1>
          <p>A new talent has completed their profile setup!</p>
          <h2>Talent Details:</h2>
          <ul>
            <li><strong>Artist Name:</strong> ${data.artist_name || 'Not provided'}</li>
            <li><strong>Email:</strong> ${data.talent_email || 'Not provided'}</li>
            <li><strong>Act:</strong> ${data.act || 'Not specified'}</li>
            <li><strong>Rate:</strong> ${data.rate_per_hour || 'Not set'} ${data.currency || ''}</li>
            <li><strong>Talent ID:</strong> ${data.talent_id || 'Not provided'}</li>
          </ul>
          <p><a href="${appUrl}/admin/users">Review Talent</a></p>
        `;
        subject = 'New Talent Profile Created';
        break;

      case 'admin_booking_created':
        emailHtml = `
          <h1>New Booking Request</h1>
          <p>A new booking request has been submitted!</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>📋 Booking Details:</h2>
            <p><strong>Booking ID:</strong> ${data.booking_id || 'Not provided'}</p>
            <p><strong>Status:</strong> ${data.status || 'Pending'}</p>
          </div>
          
          <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>👤 Client Information:</h3>
            <p><strong>Name:</strong> ${data.booker_name || 'Not provided'}</p>
            <p><strong>Email:</strong> ${data.booker_email || 'Not provided'}</p>
            <p><strong>Phone:</strong> ${data.booker_phone || 'Not provided'}</p>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🎭 Talent Information:</h3>
            <p><strong>Artist Name:</strong> ${data.talent_name || 'Not assigned'}</p>
            <p><strong>Talent Email:</strong> ${data.talent_email || 'Not available'}</p>
          </div>
          
          <div style="background-color: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🎉 Event Details:</h3>
            <p><strong>Event Type:</strong> ${data.event_type || 'Not specified'}</p>
            <p><strong>Event Date:</strong> ${data.event_date || 'Not set'}</p>
            <p><strong>Duration:</strong> ${data.event_duration ? data.event_duration + ' hours' : 'Not specified'}</p>
            <p><strong>Location:</strong> ${data.event_location || 'Not provided'}</p>
            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
            ${data.budget ? `<p><strong>Budget:</strong> ${data.budget} ${data.budget_currency || 'USD'}</p>` : ''}
          </div>
          
          <p style="margin-top: 30px;">
            <a href="${appUrl}/admin/bookings" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Manage Bookings</a>
          </p>
        `;
        subject = 'New Booking Request';
        break;

      case 'admin_booking_status_changed':
        emailHtml = `
          <h1>Booking Status Changed</h1>
          <p>A booking status has been updated!</p>
          <h2>Details:</h2>
          <ul>
            <li><strong>Booking ID:</strong> ${data.booking_id || 'Not provided'}</li>
            <li><strong>Booker:</strong> ${data.booker_name || 'Not provided'}</li>
            <li><strong>Talent:</strong> ${data.talent_name || 'Not assigned'}</li>
            <li><strong>Event Type:</strong> ${data.event_type || 'Not specified'}</li>
            <li><strong>Previous Status:</strong> ${data.old_status || 'Unknown'}</li>
            <li><strong>New Status:</strong> ${data.new_status || 'Unknown'}</li>
          </ul>
          <p><a href="${appUrl}/admin/bookings">View Booking</a></p>
        `;
        subject = 'Booking Status Changed';
        break;

      case 'admin_hero_form_submission':
        emailHtml = `
          <h1>New Event Request from Website</h1>
          <p>Someone has submitted an event request through the hero form!</p>
          
          <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>👤 Client Information:</h3>
            <p><strong>Name:</strong> ${data.booker_name || 'Not provided'}</p>
            <p><strong>Email:</strong> ${data.booker_email || 'Not provided'}</p>
            <p><strong>Phone:</strong> ${data.booker_phone || 'Not provided'}</p>
          </div>
          
          <div style="background-color: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🎉 Event Request Details:</h3>
            <p><strong>Event Type:</strong> ${data.event_type || 'Not specified'}</p>
            <p><strong>Event Date:</strong> ${data.event_date || 'Not provided'}</p>
            <p><strong>Duration:</strong> ${data.event_duration ? data.event_duration + ' hours' : 'Not specified'}</p>
            <p><strong>Location:</strong> ${data.event_location || 'Not provided'}</p>
            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : '<p><strong>Description:</strong> Not provided</p>'}
          </div>
          
        `;
        subject = 'New Event Request from Website';
        break;

      case 'admin_payment_booking':
      case 'admin_payment_subscription':
        emailHtml = `
          <h1>${data.is_subscription ? 'New Subscription Payment' : 'New Booking Payment'}</h1>
          <p>A payment has been completed!</p>
          <h2>Payment Details:</h2>
          <ul>
            <li><strong>Payment ID:</strong> ${data.payment_id || 'Not provided'}</li>
            <li><strong>Payer:</strong> ${data.booker_name || 'Not provided'}</li>
            ${data.is_subscription ? '' : `<li><strong>Talent:</strong> ${data.talent_name || 'Not assigned'}</li>`}
            <li><strong>Amount:</strong> ${data.amount || '0'} ${data.currency || 'USD'}</li>
            ${data.is_subscription ? '' : `<li><strong>Booking ID:</strong> ${data.booking_id || 'Not provided'}</li>`}
            ${data.platform_commission ? `<li><strong>Platform Commission:</strong> ${data.platform_commission} ${data.currency || 'USD'}</li>` : ''}
          </ul>
          <p><a href="${appUrl}/admin/payments">View Payments</a></p>
        `;
        subject = data.is_subscription ? 'New Subscription Payment' : 'New Booking Payment';
        break;

      // User-facing booking completion emails
      case 'booking_completed_booker':
        emailHtml = `
          <h1>Event Completed Successfully!</h1>
          <p>Hello ${data.recipient_name},</p>
          <p>Your event has been completed successfully!</p>
          <h2>Event Details:</h2>
          <ul>
            <li><strong>Performer:</strong> ${data.talent_name || 'Your booked talent'}</li>
            <li><strong>Event Type:</strong> ${data.event_type || 'Event'}</li>
            <li><strong>Date:</strong> ${data.event_date || 'Recently'}</li>
            <li><strong>Location:</strong> ${data.event_location || 'Your venue'}</li>
          </ul>
          <p>We hope you had an amazing experience! Don't forget to leave a review for your performer.</p>
          <p><a href="${appUrl}/booker-dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Booking Details</a></p>
          <p>Thank you for using Qtalent.live!<br>The Qtalent Team</p>
        `;
        subject = 'Event Completed Successfully';
        break;

      case 'booking_completed_talent':
        emailHtml = `
          <h1>Performance Completed Successfully!</h1>
          <p>Hello ${data.recipient_name},</p>
          <p>Congratulations on completing your performance!</p>
          <h2>Event Details:</h2>
          <ul>
            <li><strong>Client:</strong> ${data.booker_name || 'Your client'}</li>
            <li><strong>Event Type:</strong> ${data.event_type || 'Performance'}</li>
            <li><strong>Date:</strong> ${data.event_date || 'Recently'}</li>
            <li><strong>Location:</strong> ${data.event_location || 'Event venue'}</li>
          </ul>
          <p>Great job on another successful performance! Your payment should be processed shortly.</p>
          <p><a href="${appUrl}/talent-dashboard" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
          <p>Keep up the excellent work!<br>The Qtalent Team</p>
        `;
        subject = 'Performance Completed Successfully';
        break;

      // Payment emails
      case 'payment_receipt_booking':
        emailHtml = `
          <h1>Payment Receipt - Event Booking</h1>
          <p>Hello ${data.recipient_name},</p>
          <p>Thank you for your payment! Your booking payment has been processed successfully.</p>
          <h2>Payment Details:</h2>
          <ul>
            <li><strong>Payment ID:</strong> ${data.payment_id || 'Not available'}</li>
            <li><strong>Amount Paid:</strong> ${data.amount || '0'} ${data.currency || 'USD'}</li>
            <li><strong>Event Type:</strong> ${data.event_type || 'Event booking'}</li>
            <li><strong>Booking ID:</strong> ${data.booking_id || 'Not available'}</li>
          </ul>
          <p>Your event is now confirmed and the performer has been notified.</p>
          <p><a href="${appUrl}/booker-dashboard">View Your Bookings</a></p>
          <p>Thank you for using Qtalent.live!</p>
        `;
        subject = 'Payment Receipt - Event Booking';
        break;

      case 'payment_receipt_subscription':
        emailHtml = `
          <h1>Payment Receipt - Subscription</h1>
          <p>Hello ${data.recipient_name},</p>
          <p>Thank you for your subscription payment! Your Pro subscription is now active.</p>
          <h2>Payment Details:</h2>
          <ul>
            <li><strong>Payment ID:</strong> ${data.payment_id || 'Not available'}</li>
            <li><strong>Amount Paid:</strong> ${data.amount || '0'} ${data.currency || 'USD'}</li>
            <li><strong>Subscription:</strong> Pro Features</li>
          </ul>
          <p>You now have access to all Pro features including advanced booking tools and priority support.</p>
          <p><a href="${appUrl}/talent-dashboard">Access Your Dashboard</a></p>
          <p>Thank you for upgrading!</p>
        `;
        subject = 'Payment Receipt - Subscription';
        break;

      case 'payment_received_talent':
        emailHtml = `
          <h1>Payment Received!</h1>
          <p>Hello ${data.recipient_name},</p>
          <p>Great news! Payment for your performance has been received and processed.</p>
          <h2>Payment Details:</h2>
          <ul>
            <li><strong>Client:</strong> ${data.booker_name || 'Your client'}</li>
            <li><strong>Your Earnings:</strong> ${data.amount || '0'} ${data.currency || 'USD'}</li>
            <li><strong>Event Type:</strong> ${data.event_type || 'Performance'}</li>
            <li><strong>Payment ID:</strong> ${data.payment_id || 'Not available'}</li>
          </ul>
          <p>The payment will be transferred to your account according to our payout schedule.</p>
          <p><a href="${appUrl}/talent-dashboard">View Earnings</a></p>
          <p>Thank you for being part of Qtalent.live!</p>
        `;
        subject = 'Payment Received for Your Performance';
        break;

      // Legacy support for existing email types
      // Legacy support for existing email types
      case 'booking':
        emailHtml = generateBookingEmailHtml({
          recipientName: data.recipient_name || 'User',
          eventType: data.eventType,
          eventDate: data.eventDate,
          eventLocation: data.eventLocation,
          bookerName: data.bookerName,
          talentName: data.talentName,
          bookingStatus: data.status,
          bookingId: data.bookingId,
          appUrl,
          isForTalent: data.isForTalent,
          showFullDetails: data.showFullDetails || false,
          bookerEmail: data.bookerEmail,
          bookerPhone: data.bookerPhone,
          description: data.description,
          eventDuration: data.eventDuration,
          budget: data.budget,
          budgetCurrency: data.budgetCurrency,
          eventAddress: data.eventAddress,
        });
        subject = data.isForTalent ? 'New Booking Request' : 'Booking Update';
        break;

      case 'message':
        emailHtml = generateMessageEmailHtml({
          recipientName: data.recipient_name || 'User',
          senderName: data.senderName,
          eventType: data.eventType,
          eventDate: data.eventDate,
          messagePreview: data.messagePreview,
          bookingId: data.bookingId,
          appUrl,
          isFromTalent: data.isFromTalent,
        });
        subject = `New message from ${data.senderName}`;
        break;

      case 'payment':
        emailHtml = generatePaymentEmailHtml({
          recipientName: data.recipient_name || 'User',
          eventType: data.eventType,
          eventDate: data.eventDate,
          totalAmount: data.totalAmount,
          currency: data.currency,
          bookingId: data.bookingId,
          appUrl,
          isForTalent: data.isForTalent,
          talentEarnings: data.talentEarnings,
          platformCommission: data.platformCommission,
        });
        subject = data.isForTalent ? 'Payment Received' : 'Payment Processed';
        break;

      case 'admin':
        emailHtml = generateAdminEmailHtml({
          eventType: data.eventType || '',
          notificationType: data.notificationType,
          bookerName: data.bookerName,
          talentName: data.talentName,
          eventDate: data.eventDate,
          eventLocation: data.eventLocation,
          amount: data.amount,
          currency: data.currency,
          bookingId: data.bookingId,
          talentId: data.talentId,
          appUrl,
        });
        subject = `Admin Notification: ${data.notificationType || 'Update'}`;
        break;

      case 'event_request_confirmation':
        emailHtml = generateEventRequestConfirmationEmailHtml({
          recipientName: data.recipient_name || 'User',
          eventData: data.eventData,
          appUrl,
        });
        subject = 'Event Request Confirmation';
        break;

      case 'booking_request_talent':
        emailHtml = `
          <h1>New Booking Request for Your Services</h1>
          <p>Hello ${data.recipient_name},</p>
          <p>You have received a new booking request!</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🎉 Event Details:</h3>
            <p><strong>Booker:</strong> ${data.booker_name || 'Not provided'}</p>
            ${data.is_pro_subscriber && data.booker_email ? `<p><strong>Email:</strong> ${data.booker_email}</p>` : ''}
            ${data.is_pro_subscriber && data.booker_phone ? `<p><strong>Phone:</strong> ${data.booker_phone}</p>` : ''}
            <p><strong>Event Type:</strong> ${data.event_type || 'Not specified'}</p>
            <p><strong>Event Date:</strong> ${data.event_date || 'Not set'}</p>
            <p><strong>Duration:</strong> ${data.event_duration ? data.event_duration + ' hours' : 'Not specified'}</p>
            <p><strong>Location:</strong> ${data.event_location || 'Not provided'}</p>
            ${data.is_pro_subscriber && data.event_address ? `<p><strong>Full Address:</strong> ${data.event_address}</p>` : ''}
            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
          </div>
          
          ${!data.is_pro_subscriber ? `<div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0;"><strong>💎 Pro Feature:</strong> Full client contact details and complete address are available with Pro subscription. <a href="${appUrl}/" style="color: #d97706;">Upgrade now</a> to access all booking details!</p>
          </div>` : ''}
          
          <p><a href="${appUrl}/talent-dashboard" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Booking Request</a></p>
          <p>Best regards,<br>The Qtalent Team</p>
        `;
        subject = 'New Booking Request for Your Services';
        break;

      case 'booking_approved_booker':
        emailHtml = `
          <h1>Great News! Your Booking Request Has Been Accepted</h1>
          <p>Hello ${data.recipient_name},</p>
          <p>Excellent news! <strong>${data.talent_name}</strong> has accepted your booking request!</p>
          
          <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h3>✅ Confirmed Event Details:</h3>
            <p><strong>Talent:</strong> ${data.talent_name}</p>
            <p><strong>Event Type:</strong> ${data.event_type || 'Not specified'}</p>
            <p><strong>Event Date:</strong> ${data.event_date || 'Not set'}</p>
            <p><strong>Duration:</strong> ${data.event_duration ? data.event_duration + ' hours' : 'Not specified'}</p>
            <p><strong>Location:</strong> ${data.event_location || 'Not provided'}</p>
          </div>
          
          <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📋 Next Steps:</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Your booking is now <strong>accepted</strong> and needs confirmation</li>
              <li>Click "Confirm Booking" in your dashboard to finalize</li>
              <li>You can message the talent directly through our chat system</li>
              <li>Payment will be processed once you confirm the booking</li>
            </ul>
          </div>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/booker-dashboard" style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-right: 10px;">Confirm Booking</a>
            <a href="${appUrl}/booker-dashboard" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Chat with Talent</a>
          </p>
          
          <p>We're excited to help make your event amazing!<br>The Qtalent Team</p>
        `;
        subject = 'Great News! Your Booking Request Has Been Accepted';
        break;

      case 'admin_support_message':
        emailHtml = generateAdminSupportMessageEmailHtml({
          senderName: data.sender_name || 'User',
          senderEmail: data.sender_email || 'N/A',
          messagePreview: data.message_preview || '',
          appUrl,
        });
        subject = '🆘 New Support Message from ' + (data.sender_name || 'User');
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    logStep('Sending email', { to: recipientEmail, subject });

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'Qtalent <noreply@qtalent.live>',
      to: [recipientEmail],
      subject,
      html: emailHtml,
    });

    if (emailError) {
      logStep('Email send error', emailError);
      
      // Update log with error
      if (logId) {
        try {
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );
          
          await supabase
            .from('email_logs')
            .update({ 
              status: 'failed', 
              error_message: emailError.message || 'Unknown error'
            })
            .eq('id', logId);
        } catch (logError) {
          console.log('Failed to update email log with error:', logError);
        }
      }
      
      throw emailError;
    }

    // Update log with success
    if (logId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase
          .from('email_logs')
          .update({ status: 'sent' })
          .eq('id', logId);
      } catch (logError) {
        console.log('Failed to update email log with success:', logError);
      }
    }

    logStep('Email sent successfully', emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    logStep('Error in send-email function', { error: error.message });
    console.error('Error in send-email function:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});