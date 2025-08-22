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
    if (!user) {
      setIsAdmin(false);
      setAdminPermissions([]);
      setLoading(false);
      return;
    }

    try {
      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabase
        .rpc('is_admin', { user_id_param: user.id });

      if (adminError) throw adminError;

      setIsAdmin(adminCheck || false);

      if (adminCheck) {
        // Get admin permissions
        const { data: permissions, error: permError } = await supabase
          .rpc('get_admin_permissions', { user_id_param: user.id });

        if (permError) throw permError;
        setAdminPermissions(permissions || []);
      } else {
        setAdminPermissions([]);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setAdminPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
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