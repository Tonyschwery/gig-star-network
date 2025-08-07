// PASTE THIS INTO src/components/ProtectedTalentRoute.tsx
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import React from 'react';

interface ProtectedTalentRouteProps {
  children: JSX.Element;
  requireProfile?: boolean;
}

export const ProtectedTalentRoute = ({ children, requireProfile = true }: ProtectedTalentRouteProps) => {
  const { user, loading } = useAuth(); // Note: Original simplified version may not have 'profile'
  
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // This is a simplified placeholder logic.
  // A proper implementation would check for a talent profile.
  // For now, we just protect against non-logged-in users.
  
  return children;
};