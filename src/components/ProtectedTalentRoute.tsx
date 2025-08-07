// PASTE THIS ENTIRE CODE BLOCK INTO src/components/ProtectedTalentRoute.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserProfile } from '@/hooks/useAuth'; // Assuming useAuth exports UserProfile

// Helper component to handle the actual logic
const TalentRouteLogic = ({ children, requireProfile }: { children: JSX.Element; requireProfile: boolean; }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner
  }

  if (!user) {
    // If not logged in, always redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // This is the main logic block
  if (requireProfile && !profile) {
    // This route requires a profile, but the user doesn't have one.
    // Send them to the onboarding page.
    return <Navigate to="/talent-onboarding" replace />;
  }
  
  if (!requireProfile && profile) {
    // This is the onboarding page, but the user ALREADY has a profile.
    // Send them to their dashboard.
    return <Navigate to="/talent-dashboard/bookings" replace />;
  }

  // If none of the above conditions are met, the user is authorized.
  return children;
};


// Main component that uses the helper
interface ProtectedTalentRouteProps {
  children: JSX.Element;
  requireProfile?: boolean;
}

export const ProtectedTalentRoute = ({ children, requireProfile = true }: ProtectedTalentRouteProps) => {
  return <TalentRouteLogic requireProfile={requireProfile}>{children}</TalentRouteLogic>;
};