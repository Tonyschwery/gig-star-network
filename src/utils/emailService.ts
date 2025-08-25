import { supabase } from "@/integrations/supabase/client";

export interface SendWelcomeEmailData {
  type: 'user_signup' | 'talent_profile_created';
  userId: string;
  email: string;
  userData: {
    firstName?: string;
    lastName?: string;
    artistName?: string;
  };
}

/**
 * Send welcome email using edge function
 * This function handles errors gracefully - if email sending fails, it won't break the signup process
 */
export const sendWelcomeEmail = async (emailData: SendWelcomeEmailData): Promise<boolean> => {
  try {
    console.log('Calling welcome-email function with data:', emailData);
    const { data, error } = await supabase.functions.invoke('welcome-email', {
      body: emailData
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }

    console.log('Welcome email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

/**
 * Send admin notification email using edge function
 */
export const sendAdminNotification = async (userEmail: string, userData: { firstName?: string; lastName?: string }): Promise<boolean> => {
  try {
    console.log('Calling send-email function for admin notification');
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'admin-signup-notification',
        userEmail,
        userData
      }
    });

    if (error) {
      console.error('Failed to send admin notification:', error);
      return false;
    }

    console.log('Admin notification sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return false;
  }
};