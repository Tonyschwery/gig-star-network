import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  messageId: string;
  conversationId: string;
  senderType: 'booker' | 'talent';
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

    const { messageId, conversationId, senderType }: NotificationPayload = await req.json();

    console.log('Processing chat notification:', { messageId, conversationId, senderType });

    // Get message details
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('Error fetching message:', messageError);
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get conversation details with booking and participant info
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        booking:bookings(
          id,
          event_type,
          event_date,
          booker_name
        ),
        talent_profile:talent_profiles(
          user_id,
          artist_name
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('Error fetching conversation:', convError);
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine recipient based on sender type
    let recipientId: string;
    let recipientName: string;
    let senderName: string;

    if (senderType === 'talent') {
      // Talent sent message, notify booker
      recipientId = conversation.booker_id;
      recipientName = conversation.booking?.booker_name || 'Booker';
      senderName = conversation.talent_profile?.artist_name || 'Talent';
    } else {
      // Booker sent message, notify talent
      recipientId = conversation.talent_profile?.user_id;
      recipientName = conversation.talent_profile?.artist_name || 'Talent';
      senderName = conversation.booking?.booker_name || 'Booker';
    }

    if (!recipientId) {
      console.error('Could not determine recipient');
      return new Response(JSON.stringify({ error: 'Recipient not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if recipient has message notifications enabled
    const { data: preferences } = await supabase
      .from('email_preferences')
      .select('message_notifications')
      .eq('user_id', recipientId)
      .single();

    const shouldSendEmail = preferences?.message_notifications !== false;

    // Create in-app notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'new_message',
        title: `New message from ${senderName}`,
        message: `You have a new message about your ${conversation.booking?.event_type || 'booking'} event.`,
        booking_id: conversation.booking_id,
        message_id: messageId
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    // Send email notification if enabled
    if (shouldSendEmail) {
      const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
        body: {
          emailType: 'message',
          userIds: [recipientId],
          messageId: messageId,
          skipPreferenceCheck: false
        }
      });

      if (emailError) {
        console.error('Error sending email notification:', emailError);
      }
    }

    console.log('Chat notification processed successfully');

    return new Response(JSON.stringify({ 
      success: true,
      notificationSent: true,
      emailSent: shouldSendEmail 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in send-chat-notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});