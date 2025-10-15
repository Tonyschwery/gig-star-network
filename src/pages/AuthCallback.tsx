import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const redirectKey = "auth_callback_redirecting";
    const maxWaitTime = 10000; // 10 seconds max wait to prevent permanent locks

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
        sessionStorage.removeItem(redirectKey);
        navigate("/", { replace: true });
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Finalizing login, please wait...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
