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
    // Parse hash parameters (Supabase sends tokens and type in URL hash)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const authType = hashParams.get("type") || searchParams.get("type");
    const error_code = searchParams.get("error_code");
    const error_description = searchParams.get("error_description");

    console.log("[AuthCallback] URL params:", { 
      authType, 
      error_code, 
      error_description,
      hash: window.location.hash 
    });

    // Handle Supabase auth errors (expired/invalid tokens)
    if (error_code) {
      console.error("[AuthCallback] Auth error:", error_code, error_description);
      setError(error_description || "The link is invalid or has expired. Please request a new one.");
      return;
    }

    // If this is a password recovery, redirect to update-password page
    if (authType === "recovery") {
      console.log("[AuthCallback] Password recovery detected, setting flag and redirecting...");
      setIsRecovery(true);
      // Set a flag to indicate we came from recovery
      sessionStorage.setItem('isPasswordRecovery', 'true');
      // Wait a brief moment for session to fully persist
      setTimeout(() => {
        navigate('/update-password', { replace: true });
      }, 100);
      return;
    }

    // Regular login/session handling
    const performRedirect = async (session: Session | null) => {
      if (!session?.user) {
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
      } catch (err) {
        console.error("Error ensuring profile:", err);
      }

      // Redirect logic
      const storedIntent = localStorage.getItem("bookingIntent");
      let bookingData = null;
      if (storedIntent) {
        try {
          bookingData = JSON.parse(storedIntent);
          localStorage.removeItem("bookingIntent");
        } catch (e) {
          console.error("Error parsing booking intent:", e);
        }
      }

      if (user.email === "admin@qtalent.live") {
        navigate("/admin", { replace: true });
      } else if (bookingData?.talentId) {
        toast({
          title: "Welcome! 🎉",
          description: `You can now book ${bookingData.talentName || "your talent"}.`,
          duration: 4000,
        });
        navigate(`/talent/${bookingData.talentId}`, { state: { openBookingForm: true }, replace: true });
      } else if (user.user_metadata?.user_type === "talent") {
        navigate("/talent-dashboard", { replace: true });
      } else {
        navigate("/booker-dashboard", { replace: true });
      }
    };

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) performRedirect(session);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) performRedirect(session);
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
