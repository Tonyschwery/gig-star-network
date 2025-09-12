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
      // Send admin notification with phone number
      const adminEmails = ['qtalentslive@gmail.com'];
      await sendNotificationEmail('admin_hero_form_submission', [], {
        recipient_name: 'Admin',
        booker_name: eventRequestData.booker_name,
        booker_email: eventRequestData.booker_email,
        booker_phone: eventRequestData.booker_phone,
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
      console.log('sendBookingEmails called with data:', bookingData);
      
      // Get talent profile details including Pro status
      let talentProfile = null;
      if (bookingData.talent_id) {
        console.log('Fetching talent profile for talent_id:', bookingData.talent_id);
        const { data, error } = await supabase
          .from('talent_profiles')
          .select('user_id, artist_name, is_pro_subscriber')
          .eq('id', bookingData.talent_id)
          .single();
        
        if (error) {
          console.error('Error fetching talent profile:', error);
        } else {
          console.log('Talent profile found:', data);
          talentProfile = data;
        }
      }

      // Send admin notification for new booking with complete information
      const adminEmails = ['qtalentslive@gmail.com'];
      console.log('Sending admin notification email...');
      await sendNotificationEmail('admin_booking_created', [], {
        recipient_name: 'Admin',
        booking_id: bookingData.id,
        booker_name: bookingData.booker_name,
        booker_email: bookingData.booker_email,
        booker_phone: bookingData.booker_phone,
        talent_name: bookingData.talent_name || 'TBD',
        event_type: bookingData.event_type,
        event_date: bookingData.event_date,
        event_duration: bookingData.event_duration,
        event_location: bookingData.event_location,
        description: bookingData.description,
        budget: bookingData.budget,
        budget_currency: bookingData.budget_currency,
        status: bookingData.status,
        subject: 'New Booking Request',
        admin_emails: adminEmails
      });

      // Send notification to talent if talent is assigned
      if (bookingData.talent_id && talentProfile) {
        console.log('Sending talent notification email to user:', talentProfile.user_id);
        
        // Prepare email data based on Pro status
        const emailData: any = {
          recipient_name: talentProfile.artist_name,
          booker_name: bookingData.booker_name,
          event_type: bookingData.event_type,
          event_date: bookingData.event_date,
          event_duration: bookingData.event_duration,
          description: bookingData.description,
          booking_id: bookingData.id,
          is_pro_subscriber: talentProfile.is_pro_subscriber,
          subject: 'New Booking Request for Your Services'
        };

        // Include sensitive details only for Pro subscribers
        if (talentProfile.is_pro_subscriber) {
          console.log('Talent is Pro - including full details');
          emailData.booker_email = bookingData.booker_email;
          emailData.booker_phone = bookingData.booker_phone;
          emailData.event_location = bookingData.event_location;
          emailData.event_address = bookingData.event_address;
          emailData.budget = bookingData.budget;
          emailData.budget_currency = bookingData.budget_currency;
        } else {
          console.log('Talent is not Pro - limiting details');
          // For non-Pro, show general location only
          emailData.event_location = bookingData.event_location?.split(',')[0] + ' (Upgrade to Pro for full details)';
        }

        console.log('Talent email data prepared:', emailData);
        await sendNotificationEmail('booking_request_talent', [talentProfile.user_id], emailData);
        console.log('Talent notification email sent successfully');
      } else {
        console.log('No talent assigned or talent profile not found - skipping talent email');
      }

    } catch (error) {
      console.error('Error sending booking emails:', error);
    }
  };

  const sendBookingApprovalEmails = async (bookingData: any, talentName: string) => {
    try {
      // Send notification to booker that talent has accepted their booking
      await sendNotificationEmail('booking_approved_booker', [bookingData.user_id], {
        recipient_name: bookingData.booker_name,
        talent_name: talentName,
        event_type: bookingData.event_type,
        event_date: bookingData.event_date,
        event_location: bookingData.event_location,
        event_duration: bookingData.event_duration,
        booking_id: bookingData.id,
        subject: 'Great News! Your Booking Request Has Been Accepted'
      });

    } catch (error) {
      console.error('Error sending booking approval emails:', error);
    }
  };

  return {
    sendNotificationEmail,
    sendUserSignupEmails,
    sendTalentProfileEmails,
    sendEventRequestEmails,
    sendBookingEmails,
    sendBookingApprovalEmails
  };
};