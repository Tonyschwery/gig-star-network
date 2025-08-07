// PASTE THIS ENTIRE CODE BLOCK INTO src/components/ProtectedTalentRoute.tsx

import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedTalentRouteProps {
  children: JSX.Element;
  requireProfile?: boolean;
}

export const ProtectedTalentRoute = ({ children, requireProfile = true }: ProtectedTalentRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If this route requires a profile, but the user doesn't have one,
  // redirect them to the onboarding page.
  if (requireProfile && !profile) {
    return <Navigate to="/talent-onboarding" replace />;
  }
  
  // If this route is for onboarding (requireProfile=false), but the user
  // already has a profile, redirect them to their dashboard.
  if (!requireProfile && profile) {
      return <Navigate to="/talent-dashboard/bookings" replace />;
  }

  return children;
};