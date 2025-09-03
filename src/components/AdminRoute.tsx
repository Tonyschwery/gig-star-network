import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

export function AdminRoute({ children, requiredPermissions = [] }: AdminRouteProps) {
  const { isAdmin, adminPermissions, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AdminRoute: useEffect - loading:', loading, 'isAdmin:', isAdmin);
    if (!loading && !isAdmin) {
      console.log('AdminRoute: Redirecting to auth - user is not admin');
      navigate('/auth');
    }
  }, [isAdmin, loading, navigate]);

  const hasRequiredPermissions = requiredPermissions.length === 0 || 
    requiredPermissions.every(perm => 
      adminPermissions.includes('all') || adminPermissions.includes(perm)
    );

  console.log('AdminRoute: Rendering - loading:', loading, 'isAdmin:', isAdmin, 'hasRequiredPermissions:', hasRequiredPermissions);

  if (loading) {
    console.log('AdminRoute: Showing loading state');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading admin access...</div>
      </div>
    );
  }

  if (!isAdmin) {
    console.log('AdminRoute: User is not admin, returning null (will redirect)');
    return null; // Will redirect to auth
  }

  if (!hasRequiredPermissions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have the required permissions to access this area.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}