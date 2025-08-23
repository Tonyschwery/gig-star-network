import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { WelcomeEmail } from "./_templates/welcome-email.tsx";
import { TalentWelcomeEmail } from "./_templates/talent-welcome-email.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, userId, email, userData }: WelcomeEmailRequest = await req.json();

    if (!type || !userId || !email) {
      throw new Error("Missing required parameters: type, userId, or email");
    }

    console.log(`Processing welcome email: ${type} for user ${userId}`);

    let emailHtml: string;
    let subject: string;

    if (type === 'user_signup') {
      // Send generic welcome email to all new users
      subject = "Welcome to GCC Talents!";
      emailHtml = await renderAsync(
        React.createElement(WelcomeEmail, {
          userEmail: email,
          firstName: userData?.firstName || '',
          appUrl: Deno.env.get("SUPABASE_URL")?.replace('/auth/v1', '') || 'https://gcctalents.com'
        })
      );
    } else if (type === 'talent_profile_created') {
      // Send talent-specific confirmation email
      subject = "Congratulations! Your Talent Profile is Now Live";
      emailHtml = await renderAsync(
        React.createElement(TalentWelcomeEmail, {
          artistName: userData?.artistName || 'Talented Artist',
          userEmail: email,
          appUrl: Deno.env.get("SUPABASE_URL")?.replace('/auth/v1', '') || 'https://gcctalents.com'
        })
      );
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