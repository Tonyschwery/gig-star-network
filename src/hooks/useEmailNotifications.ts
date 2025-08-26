import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useEmailNotifications = () => {
  const { toast } = useToast();

  const sendNotificationEmail = async (
    eventType: string,
    userIds: string[],
    emailData: Record<string, any>
  ) => {
    try {
      console.log('Sending notification email:', { eventType, userIds, emailData });
      
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          emailType: eventType,
          userIds,
          emailData
        }
      });

      if (error) {
        console.error('Error sending notification email:', error);
        return { success: false, error };
      }

      console.log('Email notification sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error in sendNotificationEmail:', error);
      return { success: false, error };
    }
  };

  const sendUserSignupEmails = async (userId: string, userName: string, userEmail: string) => {
    try {
      // Send welcome email to user
      await sendNotificationEmail('user_signup_welcome', [userId], {
        recipient_name: userName,
        user_email: userEmail,
        user_id: userId,
        subject: 'Welcome to Qtalent.live!'
      });

      // Send admin notification - use admin user IDs or emails
      const adminEmails = ['qtalentslive@gmail.com'];
      await sendNotificationEmail('admin_user_signup', [], {
        recipient_name: 'Admin',
        user_name: userName,
        user_email: userEmail,
        user_id: userId,
        signup_date: new Date().toISOString(),
        subject: 'New User Signup on Qtalent',
        admin_emails: adminEmails
      });

    } catch (error) {
      console.error('Error sending signup emails:', error);
    }
  };

  const sendTalentProfileEmails = async (
    userId: string, 
    userEmail: string, 
    artistName: string, 
    talentId: string,
    act: string,
    ratePerHour: number,
    currency: string
  ) => {
    try {
      // Send talent welcome email
      await sendNotificationEmail('talent_welcome', [userId], {
        recipient_name: artistName,
        artist_name: artistName,
        user_email: userEmail,
        talent_id: talentId,
        subject: 'Congratulations! Your Talent Profile is Now Live'
      });

      // Send admin notification
      const adminEmails = ['qtalentslive@gmail.com'];
      await sendNotificationEmail('admin_talent_created', [], {
        recipient_name: 'Admin',
        artist_name: artistName,
        talent_email: userEmail,
        talent_id: talentId,
        act,
        rate_per_hour: ratePerHour,
        currency,
        subject: 'New Talent Profile Created',
        admin_emails: adminEmails
      });

    } catch (error) {
      console.error('Error sending talent profile emails:', error);
    }
  };

  const sendEventRequestEmails = async (eventRequestData: any) => {
    try {
      // Send confirmation email to requester
      await sendNotificationEmail('event_request_confirmation', [eventRequestData.user_id], {
        recipientName: eventRequestData.booker_name,
        eventData: {
          event_date: eventRequestData.event_date,
          event_duration: eventRequestData.event_duration,
          event_location: eventRequestData.event_location,
          event_type: eventRequestData.event_type,
          description: eventRequestData.description
        },
        subject: 'Event Request Confirmation - We received your request!'
      });

      // Send admin notification
      const adminEmails = ['qtalentslive@gmail.com'];
      await sendNotificationEmail('admin_hero_form_submission', [], {
        recipient_name: 'Admin',
        booker_name: eventRequestData.booker_name,
        booker_email: eventRequestData.booker_email,
        event_type: eventRequestData.event_type,
        event_date: eventRequestData.event_date,
        event_location: eventRequestData.event_location,
        event_duration: eventRequestData.event_duration,
        description: eventRequestData.description,
        subject: 'New Event Request from Website',
        admin_emails: adminEmails
      });

    } catch (error) {
      console.error('Error sending event request emails:', error);
    }
  };

  const sendBookingEmails = async (bookingData: any) => {
    try {
      // Send admin notification for new booking
      const adminEmails = ['qtalentslive@gmail.com'];
      await sendNotificationEmail('admin_booking_created', [], {
        recipient_name: 'Admin',
        booking_id: bookingData.id,
        booker_name: bookingData.booker_name,
        booker_email: bookingData.booker_email,
        talent_name: bookingData.talent_name || 'TBD',
        event_type: bookingData.event_type,
        event_date: bookingData.event_date,
        event_location: bookingData.event_location,
        status: bookingData.status,
        subject: 'New Booking Request',
        admin_emails: adminEmails
      });

    } catch (error) {
      console.error('Error sending booking emails:', error);
    }
  };

  return {
    sendNotificationEmail,
    sendUserSignupEmails,
    sendTalentProfileEmails,
    sendEventRequestEmails,
    sendBookingEmails
  };
};