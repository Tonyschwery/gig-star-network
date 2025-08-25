import { supabase } from "@/integrations/supabase/client";

export const testWelcomeEmail = async (testEmail: string = "test@example.com") => {
  console.log('🧪 Testing welcome email function directly...');
  
  try {
    const testData = {
      type: 'user_signup' as const,
      userId: 'test-user-id',
      email: testEmail,
      userData: {
        firstName: 'Test',
        lastName: 'User'
      }
    };

    console.log('🧪 Sending test data:', testData);

    const { data, error } = await supabase.functions.invoke('welcome-email', {
      body: testData
    });

    console.log('🧪 Test email response:', { data, error });

    if (error) {
      console.error('🔴 Test email failed:', error);
      return { success: false, error };
    }

    console.log('✅ Test email succeeded:', data);
    return { success: true, data };

  } catch (error) {
    console.error('🔴 Test email exception:', error);
    return { success: false, error };
  }
};

export const testAdminEmail = async (testEmail: string = "test@example.com") => {
  console.log('🧪 Testing admin notification function directly...');
  
  try {
    const testData = {
      type: 'admin-signup-notification',
      userEmail: testEmail,
      userData: {
        firstName: 'Test',
        lastName: 'User'
      }
    };

    console.log('🧪 Sending admin test data:', testData);

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: testData
    });

    console.log('🧪 Test admin email response:', { data, error });

    if (error) {
      console.error('🔴 Test admin email failed:', error);
      return { success: false, error };
    }

    console.log('✅ Test admin email succeeded:', data);
    return { success: true, data };

  } catch (error) {
    console.error('🔴 Test admin email exception:', error);
    return { success: false, error };
  }
};

// Global test functions for easy browser console access
(window as any).testWelcomeEmail = testWelcomeEmail;
(window as any).testAdminEmail = testAdminEmail;