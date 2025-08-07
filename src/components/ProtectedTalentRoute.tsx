// PASTE THIS INTO src/components/ProtectedTalentRoute.tsx

import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import React from 'react';

export const ProtectedTalentRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // A simple loading indicator
  }

  if (!user) {
    // If user is not logged in, redirect to login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // This is a basic protection layer that just checks for login.
  // It will allow us to debug the deeper logic without crashing the site.
  return children;
};