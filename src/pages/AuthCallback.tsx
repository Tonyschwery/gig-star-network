import { useEffect, useState } from "react";
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

  useEffect(() => {
    const redirectKey = "auth_callback_redirecting";
    const maxWaitTime = 10000;

    // Check if this is a password recovery link
    const type = searchParams.get("type");
    const error_code = searchParams.get("error_code");
    const error_description = searchParams.get("error_description");

    console.log("[AuthCallback] URL params:", { type, error_code, error_description });

    // Handle Supabase auth errors (expired/invalid tokens)
    if (error_code) {
      console.error("[AuthCallback] Auth error:", error_code, error_description);
      setError(error_description || "The link is invalid or has expired. Please request a new one.");
      return;
    }

    // If this is a password recovery, redirect to update-password page
    if (type === "recovery") {
      console.log("[AuthCallback] Password recovery detected, redirecting to update-password...");
      const queryParams = urlParams.toString();
      navigate(`/auth/update-password?${queryParams}`, { replace: true });
      return;
    }

    const performRedirect = async (session: Session | null) => {
      // Check if already redirecting (but with timeout escape hatch)
      const existingTimestamp = sessionStorage.getItem(`${redirectKey}_timestamp`);
      if (existingTimestamp) {
        const elapsed = Date.now() - parseInt(existingTimestamp);
        if (elapsed < maxWaitTime) {
          console.log("[AuthCallback] Already redirecting in another tab, waiting...");
          return;
        } else {
          console.log("[AuthCallback] Previous redirect timed out, proceeding with recovery...");
          sessionStorage.removeItem(redirectKey);
          sessionStorage.removeItem(`${redirectKey}_timestamp`);
        }
      }

      sessionStorage.setItem(redirectKey, "true");
      sessionStorage.setItem(`${redirectKey}_timestamp`, Date.now().toString());

      if (!session?.user) {
        console.warn("[AuthCallback] No session found, showing error...");
        sessionStorage.removeItem(redirectKey);
        sessionStorage.removeItem(`${redirectKey}_timestamp`);
        setError("Authentication failed. The link may have expired. Please try signing in again.");
        return;
      }

      const user = session.user;

      // Ensure profile exists
      try {
        await supabase.rpc("ensure_profile", {
          p_user_id: user.id,
          p_email: user.email!,
          p_role: user.user_metadata?.user_type || "booker",
        });
      } catch (error) {
        console.error("Error ensuring profile:", error);
      }

      let state: any = {};
      try {
        const stateParam = searchParams.get("state");
        if (stateParam) state = JSON.parse(stateParam);
      } catch (e) {
        console.error("Could not parse auth redirect state:", e);
      }

      const intent = state?.intent;
      const talentId = state?.talentId;
      const from = state?.from?.pathname || null;

      // Handle stored booking intent
      let bookingData = null;
      const storedIntent = localStorage.getItem("bookingIntent");
      if (storedIntent) {
        try {
          bookingData = JSON.parse(storedIntent);
          localStorage.removeItem("bookingIntent");
        } catch (e) {
          console.error("Error parsing booking intent:", e);
        }
      }

      // Redirect logic
      if (user.email === "admin@qtalent.live") {
        navigate("/admin", { replace: true });
      } else if (bookingData?.talentId) {
        toast({
          title: "Welcome! 🎉",
          description: `You can now book ${bookingData.talentName || "your talent"}.`,
          duration: 4000,
        });
        navigate(`/talent/${bookingData.talentId}`, { state: { openBookingForm: true }, replace: true });
      } else if (intent === "event-form") {
        navigate("/your-event", { replace: true });
      } else if (intent === "booking-form" && talentId) {
        navigate(`/talent/${talentId}`, { state: { openBookingForm: true }, replace: true });
      } else if (from && from !== "/auth" && from !== "/") {
        navigate(from, { replace: true });
      } else if (user.user_metadata?.user_type === "talent") {
        navigate("/talent-dashboard", { replace: true });
      } else {
        navigate("/booker-dashboard", { replace: true });
      }

      setTimeout(() => {
        sessionStorage.removeItem(redirectKey);
        sessionStorage.removeItem(`${redirectKey}_timestamp`);
      }, 3000); // Increased timeout to prevent premature cleanup
    };

    // ✅ Supabase session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) performRedirect(session);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) performRedirect(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
      setTimeout(() => {
        sessionStorage.removeItem(redirectKey);
        sessionStorage.removeItem(`${redirectKey}_timestamp`);
      }, 3000);
    };
  }, [navigate, searchParams, toast]);

  // Show error state if authentication failed
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

  // Show loading state
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
