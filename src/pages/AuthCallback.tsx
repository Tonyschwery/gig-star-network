import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const hasRedirected = useRef(false); // Prevent multiple redirects

  useEffect(() => {
    // Parse BOTH query parameters AND hash fragments
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const authType = searchParams.get("type") || hashParams.get("type");
    const error_code = searchParams.get("error_code") || hashParams.get("error_code");
    const error_description = searchParams.get("error_description") || hashParams.get("error_description");
    
    // Extract tokens from URL hash (Supabase puts them there after email confirmation)
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');

    console.log("[AuthCallback] Starting, params:", { 
      authType, 
      error_code,
      hasTokens: !!(access_token && refresh_token),
      hasRedirected: hasRedirected.current
    });

    // Prevent duplicate processing
    if (hasRedirected.current) {
      console.log("[AuthCallback] Already redirected, skipping");
      return;
    }

    // Handle Supabase auth errors
    if (error_code) {
      console.error("[AuthCallback] Auth error:", error_code, error_description);
      setError(error_description || "The link is invalid or has expired. Please request a new one.");
      return;
    }

    // Password recovery flow
    if (authType === "recovery") {
      console.log("[AuthCallback] Password recovery detected");
      hasRedirected.current = true;
      setIsRecovery(true);
      sessionStorage.setItem('isPasswordRecovery', 'true');
      navigate('/update-password', { replace: true });
      return;
    }

    // FALLBACK: Handle old email verification flow (when redirected from /auth/v1/verify)
    // In this case, Supabase has already set the session in the background
    if (authType === "signup" && !access_token && !refresh_token) {
      console.log("[AuthCallback] Old verification flow detected, checking for session");
      hasRedirected.current = true;
      
      // SET THE FLAG (like password recovery)
      sessionStorage.setItem('isEmailVerification', 'true');
      
      // Wait a moment for Supabase to finish setting the session
      setTimeout(() => {
        supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
          if (sessionError || !session) {
            console.error("[AuthCallback] No session found after email verification");
            setError("Email verified but session not found. Please try signing in manually.");
            return;
          }

          const user = session.user;
          console.log("[AuthCallback] Session found for user:", user.id);

          // Ensure profile exists
          try {
            await supabase.rpc("ensure_profile", {
              p_user_id: user.id,
              p_email: user.email!,
              p_role: user.user_metadata?.user_type || "booker",
            });
          } catch (err) {
            console.error("[AuthCallback] Error ensuring profile:", err);
          }

          // Show welcome message
          toast({
            title: "Welcome to Qtalent! 🎉",
            description: "Your email has been verified. Taking you to your dashboard...",
            duration: 3000,
          });

          // Redirect based on user type
          setTimeout(() => {
            // Clean up the flag before redirect
            sessionStorage.removeItem('isEmailVerification');
            console.log("[AuthCallback] Email verification complete - flag cleared");
            
            if (user.email === "admin@qtalent.live") {
              window.location.href = "/admin";
            } else if (user.user_metadata?.user_type === "talent") {
              window.location.href = "/talent-dashboard";
            } else {
              window.location.href = "/booker-dashboard";
            }
          }, 1500);
        });
      }, 1000);
      
      return;
    }

    // MODERN APPROACH: Direct session exchange with tokens from URL
    if (authType === "signup" && access_token && refresh_token) {
      console.log("[AuthCallback] Direct session exchange for signup");
      hasRedirected.current = true;
      
      supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data, error: sessionError }) => {
        if (sessionError) {
          console.error("[AuthCallback] Session error:", sessionError);
          setError("Failed to authenticate. Please try signing in again.");
          return;
        }

        const session = data.session;
        const user = session?.user;

        if (!user) {
          setError("Authentication failed. Please try signing in again.");
          return;
        }

        console.log("[AuthCallback] Session set, user:", user.id);

        // Ensure profile exists
        try {
          await supabase.rpc("ensure_profile", {
            p_user_id: user.id,
            p_email: user.email!,
            p_role: user.user_metadata?.user_type || "booker",
          });
        } catch (err) {
          console.error("[AuthCallback] Error ensuring profile:", err);
        }

        // Show welcome message
        toast({
          title: "Welcome to Qtalent! 🎉",
          description: "Your email has been verified. Taking you to your dashboard...",
          duration: 3000,
        });

        // Redirect based on user type
        setTimeout(() => {
          if (user.email === "admin@qtalent.live") {
            window.location.href = "/admin";
          } else if (user.user_metadata?.user_type === "talent") {
            window.location.href = "/talent-dashboard";
          } else {
            window.location.href = "/booker-dashboard";
          }
        }, 1500);
      });
      
      return;
    }

    // Fallback: Check if user is already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !hasRedirected.current) {
        console.log("[AuthCallback] Existing session found, redirecting immediately");
        hasRedirected.current = true;
        
        const user = session.user;
        const storedIntent = localStorage.getItem("bookingIntent");
        const authIntent = localStorage.getItem("authIntent");
        
        // Event-form intent
        if (authIntent === "event-form") {
          localStorage.removeItem("authIntent");
          navigate("/your-event", { replace: true });
          return;
        }

        // Admin redirect
        if (user.email === "admin@qtalent.live") {
          navigate("/admin", { replace: true });
          return;
        }

        // Booking intent redirect
        if (storedIntent) {
          try {
            const bookingData = JSON.parse(storedIntent);
            localStorage.removeItem("bookingIntent");
            if (bookingData?.talentId) {
              navigate(`/talent/${bookingData.talentId}`, { 
                state: { openBookingForm: true }, 
                replace: true 
              });
              return;
            }
          } catch (e) {
            console.error("[AuthCallback] Error parsing booking intent:", e);
          }
        }

        // Default redirects based on user type
        if (user.user_metadata?.user_type === "talent") {
          navigate("/talent-dashboard", { replace: true });
        } else {
          navigate("/booker-dashboard", { replace: true });
        }
        
        localStorage.removeItem("authIntent");
      }
    });
  }, [navigate, searchParams, toast]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Authentication Failed</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>

          <div className="space-y-3">
            <Button onClick={() => navigate("/auth", { replace: true })} className="w-full">
              Go to Sign In
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/auth/update-password", { replace: true })}
              className="w-full"
            >
              Request New Password Reset
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">
          {isRecovery ? "Setting up password reset..." : "Finalizing login, please wait..."}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
