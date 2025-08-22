import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import React from 'npm:react@18.3.1';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

import { BookingNotificationEmail } from './_templates/booking-notification.tsx';
import { MessageNotificationEmail } from './_templates/message-notification.tsx';
import { PaymentNotificationEmail } from './_templates/payment-notification.tsx';
import { AdminNotificationEmail } from './_templates/admin-notification.tsx';
import { BroadcastNotificationEmail } from './_templates/broadcast-notification.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  type: 'booking' | 'message' | 'payment' | 'admin';
  recipientEmail: string;
  recipientName: string;
  data: any;
}

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
    const requestBody = await req.json();
    const { type, eventData } = requestBody;

    if (type === 'admin-event-request') {
      const adminEmail = "admin@qtalent.live"; // Replace with your actual admin email
      
      const emailResponse = await resend.emails.send({
        from: "Qtalent <noreply@qtalent.live>", // Replace with your verified domain
        to: [adminEmail],
        subject: `New Event Request from ${eventData.bookerName}`,
        html: `
          <h1>New Event Request</h1>
          <p>A new event request has been submitted through the website.</p>
          
          <h2>Event Details:</h2>
          <ul>
            <li><strong>Booker Name:</strong> ${eventData.bookerName}</li>
            <li><strong>Booker Email:</strong> ${eventData.bookerEmail}</li>
            <li><strong>Event Date:</strong> ${eventData.eventDate}</li>
            <li><strong>Event Duration:</strong> ${eventData.eventDuration} hours</li>
            <li><strong>Event Location:</strong> ${eventData.eventLocation}</li>
            <li><strong>Event Type:</strong> ${eventData.eventType}</li>
          </ul>
          
          ${eventData.description ? `
            <h2>Event Description:</h2>
            <p>${eventData.description}</p>
          ` : ''}
          
          <p>Please reach out to the booker at ${eventData.bookerEmail} to discuss their requirements.</p>
        `,
      });

      console.log("Admin email sent successfully:", emailResponse);

      return new Response(JSON.stringify(emailResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Legacy email types handling
    const { type: legacyType, recipientEmail, recipientName, data } = requestBody as EmailRequest;
    logStep('Request parsed', { type: legacyType || type, recipientEmail, recipientName });

    // Check if Resend API key is configured
    if (!Deno.env.get('RESEND_API_KEY')) {
      logStep('Error: RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured. Please add RESEND_API_KEY.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let emailHtml: string;
    let subject: string;
    const appUrl = 'https://myxizupccweukrxfdqmc.supabase.co'; // Your app URL

    logStep('Generating email template', { type: legacyType || type });

    switch (legacyType || type) {
      case 'booking':
        emailHtml = await renderAsync(
          React.createElement(BookingNotificationEmail, {
            recipientName,
            eventType: data.eventType,
            eventDate: data.eventDate,
            eventLocation: data.eventLocation,
            bookerName: data.bookerName,
            talentName: data.talentName,
            bookingStatus: data.status,
            bookingId: data.bookingId,
            appUrl,
            isForTalent: data.isForTalent,
          })
        );
        subject = data.isForTalent ? 'New Booking Request' : 'Booking Update';
        break;

      case 'message':
        emailHtml = await renderAsync(
          React.createElement(MessageNotificationEmail, {
            recipientName,
            senderName: data.senderName,
            eventType: data.eventType,
            eventDate: data.eventDate,
            messagePreview: data.messagePreview,
            bookingId: data.bookingId,
            appUrl,
            isFromTalent: data.isFromTalent,
          })
        );
        subject = `New message from ${data.senderName}`;
        break;

      case 'payment':
        emailHtml = await renderAsync(
          React.createElement(PaymentNotificationEmail, {
            recipientName,
            eventType: data.eventType,
            eventDate: data.eventDate,
            totalAmount: data.totalAmount,
            currency: data.currency,
            bookingId: data.bookingId,
            appUrl,
            isForTalent: data.isForTalent,
            talentEarnings: data.talentEarnings,
            platformCommission: data.platformCommission,
          })
        );
        subject = data.isForTalent ? 'Payment Received' : 'Payment Processed';
        break;

      case 'admin':
        emailHtml = await renderAsync(
          React.createElement(AdminNotificationEmail, {
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
          })
        );
        subject = `Admin Alert: ${data.notificationType.replace('_', ' ')}`;
        break;

      case 'broadcast':
        emailHtml = await renderAsync(
          React.createElement(BroadcastNotificationEmail, {
            message: data.message,
            recipientType: data.recipientType,
            appUrl,
          })
        );
        subject = 'qtalent';
        break;

      default:
        throw new Error(`Unknown email type: ${legacyType || type}`);
    }

    logStep('Sending email', { to: recipientEmail, subject });

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'GCC Talents <onboarding@resend.dev>', // You'll need to update this with your verified domain
      to: [recipientEmail],
      subject,
      html: emailHtml,
    });

    if (emailError) {
      logStep('Email send error', emailError);
      throw emailError;
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