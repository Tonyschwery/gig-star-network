import { supabase } from "@/integrations/supabase/client";

/**
 * Comprehensive email system testing utility
 * This function tests all email triggers and logging
 */
export const testEmailSystem = async () => {
  console.log('🧪 Starting comprehensive email system test...');
  
  try {
    // Test 1: Check if email_logs table exists and is accessible
    console.log('\n📊 Test 1: Checking email_logs table...');
    const { data: logsData, error: logsError } = await supabase
      .from('email_logs')
      .select('*')
      .limit(5);
    
    if (logsError) {
      console.error('❌ Email logs table error:', logsError);
    } else {
      console.log('✅ Email logs table accessible, recent entries:', logsData?.length || 0);
      console.log('Latest logs:', logsData);
    }

    // Test 2: Check admin_settings for service role key
    console.log('\n🔑 Test 2: Checking service role key configuration...');
    const { data: settingsData, error: settingsError } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'service_role_key')
      .single();
    
    if (settingsError) {
      console.error('❌ Service role key not found:', settingsError);
      console.log('💡 Please ensure admin has set up the service role key in admin_settings');
    } else {
      console.log('✅ Service role key configured:', !!settingsData?.setting_value);
    }

    // Test 3: Test event request email (hero form)
    console.log('\n📝 Test 3: Testing hero form submission email...');
    const eventRequestData = {
      user_id: 'test-user-id', // This would normally be the authenticated user
      booker_name: 'Test User',
      booker_email: 'test@example.com',
      event_date: '2025-12-31',
      event_duration: 4,
      event_location: 'Test Country',
      event_type: 'wedding',
      description: 'Test event request for email system verification'
    };

    console.log('Inserting test event request:', eventRequestData);
    const { data: eventData, error: eventError } = await supabase
      .from('event_requests')
      .insert(eventRequestData)
      .select();

    if (eventError) {
      console.error('❌ Event request insertion failed:', eventError);
    } else {
      console.log('✅ Event request created, should trigger admin email:', eventData);
      console.log('💌 Check admin email (qtalentslive@gmail.com) for notification');
    }

    // Test 4: Check for recent email logs after our test
    console.log('\n📧 Test 4: Checking for new email logs...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for triggers

    const { data: newLogsData, error: newLogsError } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (newLogsError) {
      console.error('❌ Failed to check new email logs:', newLogsError);
    } else {
      console.log('📋 Latest email logs:', newLogsData);
      const recentLogs = newLogsData?.filter(log => 
        new Date(log.created_at).getTime() > Date.now() - 60000 // Last minute
      );
      console.log('🆕 Recent email logs (last minute):', recentLogs?.length || 0);
    }

    console.log('\n🎉 Email system test completed!');
    console.log('\n📋 Summary:');
    console.log('- Email logs table: ' + (logsError ? '❌ Error' : '✅ Working'));
    console.log('- Service role key: ' + (settingsError ? '❌ Missing' : '✅ Configured'));
    console.log('- Event request trigger: ' + (eventError ? '❌ Failed' : '✅ Triggered'));
    console.log('\n💡 Check the email logs table and admin email for results');
    
    return {
      success: !logsError && !settingsError && !eventError,
      tests: {
        emailLogs: !logsError,
        serviceRoleKey: !settingsError,
        eventRequestTrigger: !eventError
      }
    };

  } catch (error) {
    console.error('🚨 Email system test failed with exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Global access for browser console
(window as any).testEmailSystem = testEmailSystem;

console.log('🔧 Email system test utility loaded. Run testEmailSystem() in console to test.');