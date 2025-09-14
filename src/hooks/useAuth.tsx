import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query'; // Import the Query Client
import { supabase } from '@/integrations/supabase/client';
//gemini 14 sept
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient(); // Get the instance of the Query Client

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // **THE FIX:** Integrate with React Query
        if (event === 'SIGNED_IN') {
          // When a user signs in, invalidate all existing queries.
          // This forces all components to re-fetch their data with the new user's credentials.
          queryClient.invalidateQueries();
        }
        if (event === 'SIGNED_OUT') {
          // When a user signs out, completely clear the query cache
          // to ensure no stale data from the previous user is ever shown.
          queryClient.clear();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]); // Add queryClient to the dependency array

  const signOut = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener above will handle clearing the cache.
    // We can use a simple navigate here, but a hard reload is often safer to clear all state.
    window.location.href = '/';
  };

  const value = { user, session, loading, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}