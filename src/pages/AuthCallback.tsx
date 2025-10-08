// FILE: src/pages/AuthCallback.tsx

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (loading) {
      return;
    }

    // ✅ FIX: Changed type from {} to any to prevent TypeScript errors
    let state: any = {};
    try {
      const stateParam = searchParams.get("state");
      if (stateParam) {
        state = JSON.parse(stateParam);
      }
    } catch (e) {
      console.error("Could not parse auth redirect state:", e);
    }

    if (user) {
      const intent = state?.intent;
      const talentId = state?.talentId;
      const from = state?.from?.pathname || null;

      if (user.email === "admin@qtalent.live") {
        navigate("/admin", { replace: true });
      } else if (intent === "event-form") {
        navigate("/your-event", { replace: true });
      } else if (intent === "booking-form" && talentId) {
        navigate(`/talent/${talentId}`, { state: { openBookingForm: true }, replace: true });
      } else if (from && from !== "/auth" && from !== "/") {
        navigate(from, { replace: true });
      } else {
        const userType = user.user_metadata?.user_type;
        if (userType === "talent") {
          navigate("/talent-dashboard", { replace: true });
        } else {
          navigate("/booker-dashboard", { replace: true });
        }
      }
    } else {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Authenticating, please wait...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
