import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    // THE FIX: Rely ONLY on onAuthStateChange. It's the single source of truth.
    // It fires once immediately with the current session, and then whenever the state changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false); // The loading is finished once we have the first session state.
      }
    );

    // The redundant getSession() call has been removed to prevent race conditions.

    // Standard cleanup function to remove the listener when it's no longer needed.
    return () => {
      subscription.unsubscribe();
    };
  }, []); // The empty array ensures this effect runs only once when the app starts.

  const signOut = async () => {
    await supabase.auth.signOut();
    // Use window.location.href for a full refresh to clear all application state.
    window.location.href = '/';
  };

  const value = { user, session, loading, signOut };
  
  // THE CRITICAL FIX: We do not render the rest of the application (`children`)
  // until the initial authentication check is complete (`loading` is false).
  // This prevents all downstream components from running with an unstable auth state.
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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