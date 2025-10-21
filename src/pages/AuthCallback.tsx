import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    // Add timeout failsafe to prevent endless loading
    const timeoutId = setTimeout(() => {
      console.error("[AuthCallback] TIMEOUT - forcing error after 15 seconds");
      setError(
        "The verification process took too long. Your email may be verified. " +
        "Please try signing in manually with your email and password."
      );
    }, 15000); // 15 second timeout

    const handleCallback = async () => {
      try {
        // Parse URL parameters (query string AND hash fragment)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const authType = searchParams.get("type") || hashParams.get("type");
        const error_code = searchParams.get("error_code") || hashParams.get("error_code");
        const error_description = searchParams.get("error_description") || hashParams.get("error_description");
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        console.log("[AuthCallback] Processing:", { 
          authType, 
          hasTokens: !!(access_token && refresh_token),
          fullURL: window.location.href,
          queryParams: Object.fromEntries(searchParams.entries()),
          hashParams: Object.fromEntries(hashParams.entries())
        });

        // Handle Supabase auth errors
        if (error_code) {
          console.error("[AuthCallback] Auth error:", error_code, error_description);
          setError(error_description || "The link is invalid or has expired. Please request a new one.");
          return;
        }

        // Handle password recovery
        if (authType === "recovery") {
          console.log("[AuthCallback] Password recovery detected");
          
          // Try to set session from tokens if present (new flow)
          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({ 
              access_token, 
              refresh_token 
            });

            if (sessionError) {
              console.error("[AuthCallback] Failed to set recovery session:", sessionError);
              setError("Failed to verify reset link. Please request a new one.");
              return;
            }

            console.log("[AuthCallback] Recovery session set from tokens");
            sessionStorage.setItem('isPasswordRecovery', 'true');
            navigate('/update-password', { replace: true });
            return;
          }
          
          // If no tokens, check for existing session (old flow - Supabase sets it via cookie)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log("[AuthCallback] Recovery session found from cookie");
            sessionStorage.setItem('isPasswordRecovery', 'true');
            navigate('/update-password', { replace: true });
            return;
          }
          
          // No session found - link might be expired
          setError("Reset link has expired. Please request a new one.");
          return;
        }

        // Handle email verification (signup confirmation)
        if (authType === "signup") {
          // Modern flow: tokens in URL hash
          if (access_token && refresh_token) {
            console.log("[AuthCallback] Modern signup flow with tokens");
            const { data, error: sessionError } = await supabase.auth.setSession({ 
              access_token, 
              refresh_token 
            });

            if (sessionError || !data.session) {
              setError("Failed to authenticate. Please try signing in again.");
              return;
            }

            await handleSuccessfulVerification(data.session.user);
            return;
          }

          // Fallback: old verification flow (no tokens in URL)
          // The old /auth/v1/verify endpoint verifies email but doesn't provide tokens
          // So we just show success and redirect to sign in
          console.log("[AuthCallback] Old signup flow - email verified, redirecting to sign in");
          
          toast({
            title: "Email Confirmed! ✓",
            description: "Your email has been verified. Please sign in to continue.",
            duration: 4000,
          });

          // Redirect to auth page after brief delay
          setTimeout(() => {
            navigate("/auth", { replace: true });
          }, 2000);
          return;
        }

        // No type parameter - check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log("[AuthCallback] Existing session found, redirecting");
          handleExistingSession(session.user);
        } else {
          setError("No active session found. Please sign in again.");
        }

      } catch (err: any) {
        console.error("[AuthCallback] Unexpected error:", err);
        setError(err.message || "An unexpected error occurred");
      } finally {
        // Clear timeout on completion
        clearTimeout(timeoutId);
      }
    };

    handleCallback();
  }, []);

  const handleSuccessfulVerification = async (user: any) => {
    console.log("[AuthCallback] Email verification successful for:", user.id);

    // Ensure profile exists and create talent_profiles if needed
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

    // Redirect after delay
    setTimeout(() => {
      redirectUser(user);
    }, 1500);
  };

  const handleExistingSession = (user: any) => {
    const storedIntent = localStorage.getItem("bookingIntent");
    const authIntent = localStorage.getItem("authIntent");
    
    // Event-form intent
    if (authIntent === "event-form") {
      localStorage.removeItem("authIntent");
      navigate("/your-event", { replace: true });
      return;
    }

    // Booking intent
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

    redirectUser(user);
  };

  const redirectUser = (user: any) => {
    if (user.email === "admin@qtalent.live") {
      window.location.href = "/admin";
    } else if (user.user_metadata?.user_type === "talent") {
      window.location.href = "/talent-dashboard";
    } else {
      window.location.href = "/booker-dashboard";
    }
  };

  // Error UI
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight">Authentication Error</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/auth")} 
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
            
            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact support at{" "}
              <a href="mailto:qtalentslive@gmail.com" className="text-primary hover:underline">
                qtalentslive@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading UI
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <div className="space-y-2">
          <p className="text-lg font-medium">Completing email verification...</p>
          <p className="text-sm text-muted-foreground">Please wait while we set up your account</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
