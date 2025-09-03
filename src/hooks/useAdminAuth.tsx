import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AdminContextType {
  isAdmin: boolean;
  adminPermissions: string[];
  loading: boolean;
  checkAdminStatus: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = async () => {
    console.log('AdminAuth: checkAdminStatus called, user:', user?.id);
    if (!user) {
      console.log('AdminAuth: No user, setting not admin');
      setIsAdmin(false);
      setAdminPermissions([]);
      setLoading(false);
      return;
    }

    try {
      console.log('AdminAuth: Calling is_admin RPC for user:', user.id);
      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabase
        .rpc('is_admin', { user_id_param: user.id });

      console.log('AdminAuth: is_admin result:', adminCheck, 'error:', adminError);
      if (adminError) throw adminError;

      setIsAdmin(adminCheck || false);
      console.log('AdminAuth: Set isAdmin to:', adminCheck || false);

      if (adminCheck) {
        console.log('AdminAuth: User is admin, getting permissions');
        // Get admin permissions
        const { data: permissions, error: permError } = await supabase
          .rpc('get_admin_permissions', { user_id_param: user.id });

        console.log('AdminAuth: Permissions result:', permissions, 'error:', permError);
        if (permError) throw permError;
        setAdminPermissions(permissions || []);
      } else {
        setAdminPermissions([]);
      }
    } catch (error) {
      console.error('AdminAuth: Error checking admin status:', error);
      setIsAdmin(false);
      setAdminPermissions([]);
    } finally {
      console.log('AdminAuth: Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      console.log('AdminAuth: checking admin status, user:', user?.id);
      checkAdminStatus();
    }
  }, [user, authLoading]);

  const value = {
    isAdmin,
    adminPermissions,
    loading: loading || authLoading,
    checkAdminStatus,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminProvider');
  }
  return context;
}