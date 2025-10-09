import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  url?: string;
  bookingId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, title, body, url, bookingId }: PushNotificationRequest = await req.json();

    console.log('Sending push notification to user:', userId);

    // Get user's push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      throw subsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId);
      return new Response(
        JSON.stringify({ success: false, message: 'No push subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user`);

    // Get VAPID keys
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'VAPID keys not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Import web-push dynamically
    const webpush = await import('npm:web-push@3.6.7');
    
    // Set VAPID details
    webpush.default.setVapidDetails(
      'mailto:qtalents@proton.me',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Store notification in history for the user
    try {
      const { error: historyError } = await supabase
        .from('notification_history')
        .insert({
          user_id: userId,
          title: title,
          body: body,
          url: url || '/',
          booking_id: bookingId,
          notification_type: 'push',
        });

      if (historyError) {
        console.error('Error storing notification history:', historyError);
      } else {
        console.log('Notification stored in history');
      }
    } catch (err) {
      console.error('Failed to store notification history:', err);
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
      bookingId,
      tag: bookingId ? `booking-${bookingId}` : 'qtalent-notification',
    });

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          await webpush.default.sendNotification(pushSubscription, payload);
          
          console.log('Successfully sent notification to:', sub.endpoint);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          console.error('Error sending to subscription:', error);
          
          // If subscription is invalid (410 Gone or 404 Not Found), remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('Removing invalid subscription:', sub.endpoint);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
          
          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    console.log(`Successfully sent ${successCount}/${subscriptions.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent to ${successCount}/${subscriptions.length} subscriptions`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});