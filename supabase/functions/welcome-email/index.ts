import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  type: 'user_signup' | 'talent_profile_created';
  userId: string;
  email: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    artistName?: string;
  };
}

function generateWelcomeEmailHtml(userEmail: string, firstName: string, appUrl: string): string {
  return `
    <html>
      <body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif; background-color: #ffffff;">
        <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 560px;">
          <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; padding: 0;">Welcome to Qtalent.live!</h1>
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">Hello ${firstName || 'there'},</p>
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            Welcome to our talent marketplace! We're excited to have you join our community.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            Your account has been created successfully. You can now:
          </p>
          <ul style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0; padding-left: 20px;">
            <li>Browse and book talented performers for your events</li>
            <li>Connect with amazing artists in your area</li>
            <li>Manage your bookings through your dashboard</li>
          </ul>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}" style="background-color: #007bff; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px;">
              Explore Talents
            </a>
          </div>

          <p style="color: #898989; font-size: 12px; line-height: 22px; margin-top: 32px;">
            Best regards,<br/>
            The Qtalent Team
          </p>
        </div>
      </body>
    </html>
  `;
}

function generateTalentWelcomeEmailHtml(artistName: string, userEmail: string, appUrl: string): string {
  return `
    <html>
      <body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif; background-color: #ffffff;">
        <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 560px;">
          <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; padding: 0;">Congratulations! Your Talent Profile is Now Live</h1>
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">Hello ${artistName || 'Talented Artist'},</p>
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            Your talent profile has been successfully created and is now live on Qtalent.live!
          </p>
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            You can now:
          </p>
          <ul style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0; padding-left: 20px;">
            <li>Receive booking requests from event organizers</li>
            <li>Manage your availability and rates</li>
            <li>Build your reputation with reviews</li>
            <li>Grow your performance business</li>
          </ul>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}/talent-dashboard" style="background-color: #28a745; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px;">
              Go to Dashboard
            </a>
          </div>

          <p style="color: #898989; font-size: 12px; line-height: 22px; margin-top: 32px;">
            Best of luck with your performances!<br/>
            The Qtalent Team
          </p>
        </div>
      </body>
    </html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Welcome email function called");

    // Check if RESEND_API_KEY is available
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    console.log("RESEND_API_KEY available:", !!resendApiKey);
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    // Initialize Resend client inside the request handler
    const resend = new Resend(resendApiKey);

    const { type, userId, email, userData }: WelcomeEmailRequest = await req.json();

    if (!type || !email) {
      throw new Error("Missing required parameters: type or email");
    }

    console.log(`Processing welcome email: ${type} for user ${email}`);

    let emailHtml: string;
    let subject: string;
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace('/auth/v1', '') || 'https://qtalent.live';

    if (type === 'user_signup') {
      // Send generic welcome email to all new users
      subject = "Welcome to Qtalent.live!";
      emailHtml = generateWelcomeEmailHtml(email, userData?.firstName || '', appUrl);
    } else if (type === 'talent_profile_created') {
      // Send talent-specific confirmation email
      subject = "Congratulations! Your Talent Profile is Now Live";
      emailHtml = generateTalentWelcomeEmailHtml(userData?.artistName || 'Talented Artist', email, appUrl);
    } else {
      throw new Error("Invalid email type");
    }

    // Send the email
    const { error: emailError } = await resend.emails.send({
      from: "Qtalent <noreply@qtalent.live>",
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Failed to send welcome email:", emailError);
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

    console.log(`Welcome email sent successfully to ${email}`);

    // Send admin notification email
    const adminEmail = "qtalentslive@gmail.com";
    const adminSubject = type === 'user_signup' 
      ? "New User Signup - Qtalent.live"
      : "New Talent Profile Created - Qtalent.live";
    
    const adminEmailHtml = `
      <html>
        <body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif; background-color: #ffffff;">
          <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 560px;">
            <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; padding: 0;">${adminSubject}</h1>
            <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
              ${type === 'user_signup' ? 'A new user has signed up:' : 'A new talent profile has been created:'}
            </p>
            <ul style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0; padding-left: 20px;">
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>User ID:</strong> ${userId}</li>
              ${userData?.artistName ? `<li><strong>Artist Name:</strong> ${userData.artistName}</li>` : ''}
              ${userData?.firstName ? `<li><strong>Name:</strong> ${userData.firstName} ${userData?.lastName || ''}</li>` : ''}
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${appUrl}/admin/users" style="background-color: #007bff; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px;">
                View in Admin Panel
              </a>
            </div>
            <p style="color: #898989; font-size: 12px; line-height: 22px; margin-top: 32px;">
              This is an automated notification from Qtalent.live
            </p>
          </div>
        </body>
      </html>
    `;

    await resend.emails.send({
      from: "Qtalent <noreply@qtalent.live>",
      to: [adminEmail],
      subject: adminSubject,
      html: adminEmailHtml,
    });

    console.log(`Admin notification sent to ${adminEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${type} email sent successfully`,
        email: email
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in welcome-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});