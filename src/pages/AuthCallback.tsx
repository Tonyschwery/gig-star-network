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

    console.log("[AuthCallback] Starting, params:", { 
      authType, 
      error_code, 
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

    // Single redirect function
    const performRedirect = async (session: Session | null) => {
      // Guard against multiple calls
      if (hasRedirected.current) {
        console.log("[AuthCallback] Redirect already in progress");
        return;
      }

      if (!session?.user) {
        console.error("[AuthCallback] No session/user found");
        setError("Authentication failed. Please try signing in again.");
        return;
      }

      hasRedirected.current = true;
      const user = session.user;

      console.log("[AuthCallback] Processing redirect for user:", user.id);

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

      // Redirect logic
      const storedIntent = localStorage.getItem("bookingIntent");
      const authIntent = localStorage.getItem("authIntent");
      let bookingData = null;
      
      if (storedIntent) {
        try {
          bookingData = JSON.parse(storedIntent);
          localStorage.removeItem("bookingIntent");
        } catch (e) {
          console.error("[AuthCallback] Error parsing booking intent:", e);
        }
      }

      // Show welcome message for new signups
      if (authType === "signup" || authType === "email" || authType === "invite") {
        toast({
          title: "Welcome to Qtalent! 🎉",
          description: "Your email has been verified. Setting up your account...",
          duration: 4000,
        });
      }

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
      if (bookingData?.talentId) {
        navigate(`/talent/${bookingData.talentId}`, { 
          state: { openBookingForm: true }, 
          replace: true 
        });
        return;
      }

      // Default redirects based on user type
      if (user.user_metadata?.user_type === "talent") {
        navigate("/talent-dashboard", { replace: true });
      } else {
        navigate("/booker-dashboard", { replace: true });
      }
      
      localStorage.removeItem("authIntent");
    };

    // Single source of truth: wait for SIGNED_IN event
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthCallback] Auth event:", event);
      
      if (hasRedirected.current) {
        console.log("[AuthCallback] Already redirected, ignoring event");
        return;
      }

      if (event === "PASSWORD_RECOVERY" && session) {
        hasRedirected.current = true;
        sessionStorage.setItem('isPasswordRecovery', 'true');
        navigate('/update-password', { replace: true });
        return;
      }

      if (event === "SIGNED_IN" && session) {
        console.log("[AuthCallback] User signed in, performing redirect");
        await performRedirect(session);
      }
    });

    // Fallback: check if already signed in (for page refreshes)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !hasRedirected.current) {
        console.log("[AuthCallback] Existing session found, redirecting");
        performRedirect(session);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
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
