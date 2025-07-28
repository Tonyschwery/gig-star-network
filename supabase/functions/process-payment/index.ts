import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { PaymentNotificationEmail } from "../send-email/_templates/payment-notification.tsx";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  paymentId: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

async function sendPaymentConfirmationEmails(payment: any) {
  try {
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
        })
      );
    }

    // Send email to talent
    if (talentEmail && payment.bookings.talent_profiles) {
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
        })
      );
    }

    await Promise.all(emailPromises);
    console.log('Payment confirmation emails sent successfully');

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId }: PaymentRequest = await req.json();

    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    console.log('Processing payment:', paymentId);

    // Get payment and related booking details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        bookings!inner(
          id,
          user_id,
          talent_id,
          event_type,
          talent_profiles!inner(
            artist_name,
            user_id
          )
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('Payment fetch error:', paymentError);
      throw new Error('Payment not found');
    }

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
      console.error('Payment update error:', paymentUpdateError);
      throw new Error(`Failed to update payment: ${paymentUpdateError.message}`);
    }

    // Update booking status to completed
    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed'
      })
      .eq('id', payment.booking_id);

    if (bookingUpdateError) {
      console.error('Booking update error:', bookingUpdateError);
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
      await supabase
        .from('notifications')
        .insert(notifications);
    }

    // Send email notifications after successful payment processing
    await sendPaymentConfirmationEmails(payment);

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