import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('STRIPE WEBHOOK - Webhook received at:', new Date().toISOString());
    console.log('STRIPE WEBHOOK - Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!signature || !webhookSecret) {
      console.error('STRIPE WEBHOOK - Missing signature or webhook secret');
      throw new Error('Missing signature or webhook secret');
    }

    const body = await req.text();
    console.log('STRIPE WEBHOOK - Received body length:', body.length);

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('STRIPE WEBHOOK - Event verified:', event.type, 'ID:', event.id);
      console.log('STRIPE WEBHOOK - Full event data:', JSON.stringify(event.data.object, null, 2));
    } catch (err) {
      console.error('STRIPE WEBHOOK - Signature verification failed:', err);
      return new Response(`Webhook signature verification failed: ${err.message}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different Stripe events
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('STRIPE WEBHOOK - Processing checkout.session.completed');
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('STRIPE WEBHOOK - Session object:', JSON.stringify(session, null, 2));
        
        if (session.payment_status === 'paid') {
          console.log('STRIPE WEBHOOK - Payment confirmed for session:', session.id);
          
          // Get the payment record from our database using session metadata
          const paymentId = session.metadata?.paymentId;
          console.log('STRIPE WEBHOOK - Session metadata:', JSON.stringify(session.metadata, null, 2));
          
          if (!paymentId) {
            console.error('STRIPE WEBHOOK - No payment ID in session metadata');
            console.error('STRIPE WEBHOOK - Available metadata keys:', Object.keys(session.metadata || {}));
            throw new Error('No payment ID found in session metadata');
          }

          console.log('STRIPE WEBHOOK - Found payment ID in metadata:', paymentId);

          // FORENSIC: Let's fetch the payment record to see what we're working with
          console.log('STRIPE WEBHOOK - FORENSIC: Fetching payment record for ID:', paymentId);
          const { data: paymentData, error: paymentError } = await supabase
            .from('payments')
            .select('*, booking_id, talent_id, booker_id')
            .eq('id', paymentId)
            .single();

          if (paymentError) {
            console.error('STRIPE WEBHOOK - FORENSIC ERROR: Failed to fetch payment:', paymentError);
            throw new Error(`Failed to fetch payment: ${paymentError.message}`);
          }

          console.log('STRIPE WEBHOOK - FORENSIC: Payment record found:', JSON.stringify(paymentData, null, 2));

          // FORENSIC: Get the booking details to find the talent
          console.log('STRIPE WEBHOOK - FORENSIC: Fetching booking for ID:', paymentData.booking_id);
          const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select('*, talent_id, user_id')
            .eq('id', paymentData.booking_id)
            .single();

          if (bookingError) {
            console.error('STRIPE WEBHOOK - FORENSIC ERROR: Failed to fetch booking:', bookingError);
            throw new Error(`Failed to fetch booking: ${bookingError.message}`);
          }

          console.log('STRIPE WEBHOOK - FORENSIC: Booking record found:', JSON.stringify(bookingData, null, 2));

          // FORENSIC: If this is a gig, get the talent user_id from gig_applications
          let talentUserId = null;
          if (bookingData.is_gig_opportunity && !bookingData.talent_id) {
            console.log('STRIPE WEBHOOK - FORENSIC: This is a gig opportunity, finding talent via gig_applications');
            
            const { data: gigAppData, error: gigAppError } = await supabase
              .from('gig_applications')
              .select(`
                talent_id,
                talent_profiles!gig_applications_talent_id_fkey (
                  user_id
                )
              `)
              .eq('gig_id', paymentData.booking_id)
              .eq('status', 'invoice_sent')
              .single();

            if (gigAppError) {
              console.error('STRIPE WEBHOOK - FORENSIC ERROR: Failed to fetch gig application:', gigAppError);
            } else {
              console.log('STRIPE WEBHOOK - FORENSIC: Gig application found:', JSON.stringify(gigAppData, null, 2));
              talentUserId = gigAppData.talent_profiles?.user_id;
            }
          } else if (bookingData.talent_id) {
            console.log('STRIPE WEBHOOK - FORENSIC: This is a direct booking, getting talent user_id from talent_profiles');
            
            const { data: talentProfileData, error: talentProfileError } = await supabase
              .from('talent_profiles')
              .select('user_id')
              .eq('id', bookingData.talent_id)
              .single();

            if (talentProfileError) {
              console.error('STRIPE WEBHOOK - FORENSIC ERROR: Failed to fetch talent profile:', talentProfileError);
            } else {
              console.log('STRIPE WEBHOOK - FORENSIC: Talent profile found:', JSON.stringify(talentProfileData, null, 2));
              talentUserId = talentProfileData.user_id;
            }
          }

          console.log('STRIPE WEBHOOK - FORENSIC: Final talent user_id:', talentUserId);

          // FORENSIC: Create notifications with detailed logging
          if (talentUserId) {
            console.log('STRIPE WEBHOOK - FORENSIC: Creating notification for talent user_id:', talentUserId);
            
            const notificationPayload = {
              user_id: talentUserId,
              type: 'payment_received',
              title: 'Payment Received!',
              message: `You have received payment for your ${bookingData.event_type} event.`,
              booking_id: bookingData.id
            };

            console.log('STRIPE WEBHOOK - FORENSIC: Notification payload:', JSON.stringify(notificationPayload, null, 2));

            const { data: notificationData, error: notificationError } = await supabase
              .from('notifications')
              .insert(notificationPayload)
              .select()
              .single();

            if (notificationError) {
              console.error('STRIPE WEBHOOK - FORENSIC CRITICAL ERROR: Failed to create talent notification:', notificationError);
              console.error('STRIPE WEBHOOK - FORENSIC: Notification error details:', JSON.stringify(notificationError, null, 2));
            } else {
              console.log('STRIPE WEBHOOK - FORENSIC SUCCESS: Talent notification created:', JSON.stringify(notificationData, null, 2));
            }
          } else {
            console.error('STRIPE WEBHOOK - FORENSIC CRITICAL ERROR: No talent user_id found, cannot create notification');
          }

          // FORENSIC: Create notification for booker
          console.log('STRIPE WEBHOOK - FORENSIC: Creating notification for booker user_id:', bookingData.user_id);
          
          const bookerNotificationPayload = {
            user_id: bookingData.user_id,
            type: 'payment_completed',
            title: 'Payment Completed',
            message: `Your payment for the ${bookingData.event_type} event has been processed.`,
            booking_id: bookingData.id
          };

          console.log('STRIPE WEBHOOK - FORENSIC: Booker notification payload:', JSON.stringify(bookerNotificationPayload, null, 2));

          const { data: bookerNotificationData, error: bookerNotificationError } = await supabase
            .from('notifications')
            .insert(bookerNotificationPayload)
            .select()
            .single();

          if (bookerNotificationError) {
            console.error('STRIPE WEBHOOK - FORENSIC ERROR: Failed to create booker notification:', bookerNotificationError);
            console.error('STRIPE WEBHOOK - FORENSIC: Booker notification error details:', JSON.stringify(bookerNotificationError, null, 2));
          } else {
            console.log('STRIPE WEBHOOK - FORENSIC SUCCESS: Booker notification created:', JSON.stringify(bookerNotificationData, null, 2));
          }

          // Call our existing process-payment function
          try {
            console.log('STRIPE WEBHOOK - Calling process-payment function for payment ID:', paymentId);
            
            const { data, error } = await supabase.functions.invoke('process-payment', {
              body: { paymentId }
            });

            if (error) {
              console.error('STRIPE WEBHOOK - CRITICAL ERROR - process-payment function failed:', error);
              throw new Error(`Process payment failed: ${error.message}`);
            }

            console.log('STRIPE WEBHOOK - process-payment function completed successfully:', data);

            // MASTER TASK 2: Update booking/gig status to "confirmed" after successful payment
            console.log('STRIPE WEBHOOK - TASK 2: Updating booking/gig status to confirmed');
            
            // Check if this is a gig opportunity
            if (bookingData.is_gig_opportunity) {
              console.log('STRIPE WEBHOOK - TASK 2: Updating gig application status to confirmed');
              
              // Update gig application status to confirmed
              const { error: gigUpdateError } = await supabase
                .from('gig_applications')
                .update({ status: 'confirmed' })
                .eq('gig_id', paymentData.booking_id);

              if (gigUpdateError) {
                console.error('STRIPE WEBHOOK - TASK 2 ERROR: Failed to update gig application status:', gigUpdateError);
              } else {
                console.log('STRIPE WEBHOOK - TASK 2 SUCCESS: Gig application status updated to confirmed');
              }
            } else {
              console.log('STRIPE WEBHOOK - TASK 2: Updating booking status to confirmed');
              
              // Update booking status to confirmed
              const { error: bookingUpdateError } = await supabase
                .from('bookings')
                .update({ status: 'confirmed' })
                .eq('id', paymentData.booking_id);

              if (bookingUpdateError) {
                console.error('STRIPE WEBHOOK - TASK 2 ERROR: Failed to update booking status:', bookingUpdateError);
              } else {
                console.log('STRIPE WEBHOOK - TASK 2 SUCCESS: Booking status updated to confirmed');
              }
            }
          } catch (processError) {
            console.error('STRIPE WEBHOOK - CRITICAL ERROR - Failed to process payment:', processError);
            throw processError;
          }
        } else {
          console.log('STRIPE WEBHOOK - Payment not completed, status:', session.payment_status);
        }
        break;

      case 'payment_intent.payment_failed':
        console.log('STRIPE WEBHOOK - Processing payment_intent.payment_failed');
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('STRIPE WEBHOOK - Payment failed for:', failedPayment.id);
        
        // Could handle failed payments here if needed
        break;

      default:
        console.log('STRIPE WEBHOOK - Unhandled event type:', event.type);
    }

    console.log('STRIPE WEBHOOK - Webhook processed successfully');
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('STRIPE WEBHOOK - CRITICAL ERROR - Webhook processing failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});