// FILE: src/components/ProtectedRoute.tsx

import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // --- THE FIX IS HERE ---
  // Supabase adds '#...type=recovery' to the URL for password resets.
  // We check for this to identify the special password recovery flow.
  const isPasswordRecovery = window.location.hash.includes("type=recovery");

  // If it is a password recovery attempt, we must render the children
  // (the UpdatePassword page) immediately, bypassing all other auth checks.
  // The UpdatePassword page will then handle the Supabase event.
  if (isPasswordRecovery) {
    return <>{children}</>;
  }
  // --- END OF FIX ---

  const { status, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) {
      // Still waiting for auth status, do nothing yet.
      return;
    }

    if (status === "LOGGED_OUT") {
      // User is not logged in, redirect them to the auth page.
      // This logic remains unchanged and works as intended.
      navigate("/auth", { replace: true, state: { from: location, mode: "booker" } });
    }
  }, [status, loading, navigate, location]);

  const isAuthorized = status === "AUTHENTICATED";

  // If the user is fully authorized, show the protected content.
  if (isAuthorized && !loading) {
    return <>{children}</>;
  }

  // During the initial auth check, show a loading spinner.
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Return null by default while checks are running to prevent flashes of content.
  return null;
}
