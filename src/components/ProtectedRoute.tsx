// PASTE THIS INTO src/components/ProtectedRoute.tsx
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};