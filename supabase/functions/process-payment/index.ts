import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { PaymentNotificationEmail } from "./_templates/payment-notification.tsx";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  paymentId: string;
  bookingId?: string;
  totalAmount?: number;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

async function sendPaymentConfirmationEmails(payment: any) {
  try {
    console.log('EMAIL FUNCTION - Starting sendPaymentConfirmationEmails for payment:', payment.id);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch full user details for booker and talent
    const [bookerResponse, talentResponse] = await Promise.all([
      supabase.auth.admin.getUserById(payment.bookings.user_id),
      payment.bookings.talent_profiles?.user_id 
        ? supabase.auth.admin.getUserById(payment.bookings.talent_profiles.user_id)
        : Promise.resolve({ data: { user: null } })
    ]);

    const bookerEmail = bookerResponse.data.user?.email;
    const talentEmail = talentResponse.data.user?.email;
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace('/auth/v1', '') || 'https://gcctalents.com';
    
    console.log('EMAIL FUNCTION - Retrieved email addresses:', {
      bookerEmail: bookerEmail ? 'present' : 'missing',
      talentEmail: talentEmail ? 'present' : 'missing',
      appUrl
    });

    // Format date from booking
    const eventDate = new Date(payment.bookings.event_date || payment.bookings.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailPromises = [];

    // Send email to booker
    if (bookerEmail) {
      console.log('EMAIL FUNCTION - Preparing booker email for:', bookerEmail);
      const bookerHtml = await renderAsync(
        React.createElement(PaymentNotificationEmail, {
          recipientName: bookerResponse.data.user?.user_metadata?.first_name || 'Valued Customer',
          eventType: payment.bookings.event_type,
          eventDate: eventDate,
          totalAmount: (payment.total_amount / 100).toFixed(2),
          currency: payment.currency.toUpperCase(),
          bookingId: payment.booking_id,
          appUrl: appUrl,
          isForTalent: false
        })
      );

      emailPromises.push(
        resend.emails.send({
          from: "GCC Talents <bookings@gcctalents.com>",
          to: [bookerEmail],
          subject: "Your Booking is Confirmed!",
          html: bookerHtml,
        }).then(result => {
          console.log('EMAIL FUNCTION - Booker email sent successfully:', result);
          return result;
        }).catch(error => {
          console.error('CRITICAL ERROR - Booker email failed:', error);
          throw error;
        })
      );
    }

    // Send email to talent
    if (talentEmail && payment.bookings.talent_profiles) {
      console.log('EMAIL FUNCTION - Preparing talent email for:', talentEmail);
      const talentHtml = await renderAsync(
        React.createElement(PaymentNotificationEmail, {
          recipientName: payment.bookings.talent_profiles.artist_name || 'Talented Artist',
          eventType: payment.bookings.event_type,
          eventDate: eventDate,
          totalAmount: (payment.total_amount / 100).toFixed(2),
          currency: payment.currency.toUpperCase(),
          bookingId: payment.booking_id,
          appUrl: appUrl,
          isForTalent: true,
          talentEarnings: (payment.talent_earnings / 100).toFixed(2),
          platformCommission: ((payment.total_amount - payment.talent_earnings) / 100).toFixed(2)
        })
      );

      emailPromises.push(
        resend.emails.send({
          from: "GCC Talents <bookings@gcctalents.com>",
          to: [talentEmail],
          subject: "You Have a New Confirmed Booking!",
          html: talentHtml,
        }).then(result => {
          console.log('EMAIL FUNCTION - Talent email sent successfully:', result);
          return result;
        }).catch(error => {
          console.error('CRITICAL ERROR - Talent email failed:', error);
          throw error;
        })
      );
    }

    console.log('EMAIL FUNCTION - Sending all emails...');
    await Promise.all(emailPromises);
    console.log('EMAIL FUNCTION - All payment confirmation emails sent successfully');

  } catch (error) {
    console.error('Error sending payment confirmation emails:', error);
    // Don't throw error here - we don't want email failures to break payment processing
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Add logging to debug the incoming request
    const requestBody = await req.json();
    console.log('PAYMENT PROCESSING - Full request body received:', JSON.stringify(requestBody, null, 2));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId, bookingId, totalAmount } = requestBody;

    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    console.log('PAYMENT PROCESSING START - Payment ID:', paymentId);
    console.log('PAYMENT PROCESSING - Request received at:', new Date().toISOString());

    // Get payment and related booking details - fix the ambiguous relationship
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        bookings!booking_id(
          id,
          user_id,
          talent_id,
          event_type,
          event_date,
          talent_profiles!talent_id(
            artist_name,
            user_id
          )
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('CRITICAL ERROR - Payment fetch failed:', paymentError);
      console.error('CRITICAL ERROR - Payment ID that failed:', paymentId);
      throw new Error('Payment not found');
    }

    console.log('PAYMENT PROCESSING - Payment found:', {
      id: payment.id,
      status: payment.payment_status,
      booking_id: payment.booking_id,
      talent_id: payment.bookings?.talent_id
    });

    if (payment.payment_status === 'completed') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment already completed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment status to completed
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        payment_status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (paymentUpdateError) {
      console.error('CRITICAL ERROR - Payment update failed:', paymentUpdateError);
      console.error('CRITICAL ERROR - Payment ID that failed to update:', paymentId);
      throw new Error(`Failed to update payment: ${paymentUpdateError.message}`);
    }

    console.log('PAYMENT PROCESSING - Payment status updated to completed for payment ID:', paymentId);

    // Update booking status to confirmed (not completed - that happens later)
    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed'
      })
      .eq('id', payment.booking_id);

    console.log('Booking status updated to confirmed for booking ID:', payment.booking_id);

    if (bookingUpdateError) {
      console.error('CRITICAL ERROR - Booking update failed:', bookingUpdateError);
      console.error('CRITICAL ERROR - Booking ID that failed to update:', payment.booking_id);
      throw new Error(`Failed to update booking: ${bookingUpdateError.message}`);
    }

    // Create notifications
    const notifications = [];

    // Notification for booker
    notifications.push({
      user_id: payment.bookings.user_id,
      type: 'payment_completed',
      title: 'Payment Completed',
      message: `Your payment of ${payment.currency} ${payment.total_amount} has been processed successfully.`,
      booking_id: payment.booking_id
    });

    // Notification for talent
    if (payment.bookings.talent_profiles?.user_id) {
      notifications.push({
        user_id: payment.bookings.talent_profiles.user_id,
        type: 'payment_received',
        title: 'Payment Received',
        message: `You have received payment of ${payment.currency} ${payment.talent_earnings} for your ${payment.bookings.event_type} booking.`,
        booking_id: payment.booking_id
      });
    }

    if (notifications.length > 0) {
      console.log('NOTIFICATION PROCESSING - Creating notifications:', notifications.length);
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);
      
      if (notificationError) {
        console.error('CRITICAL ERROR - Notification creation failed:', notificationError);
      } else {
        console.log('NOTIFICATION PROCESSING - Notifications created successfully');
      }
    }

    // Send email notifications after successful payment processing
    console.log('EMAIL PROCESSING - Attempting to send payment confirmation emails');
    try {
      await sendPaymentConfirmationEmails(payment);
      console.log('EMAIL PROCESSING - Email notifications sent successfully');
    } catch (emailError) {
      console.error('CRITICAL ERROR - Email sending failed:', emailError);
      // Don't throw here - payment is still successful even if email fails
    }

    console.log('Payment processed successfully:', paymentId);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId,
        totalAmount: payment.total_amount,
        talentEarnings: payment.talent_earnings,
        currency: payment.currency
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});