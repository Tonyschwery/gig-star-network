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
    // onAuthStateChange is the single source of truth. It fires immediately
    // with the initial session state, and then for any changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // Once the first event has fired, we know the user's auth state. We can stop loading.
        setLoading(false);
      }
    );

    // This is the standard cleanup function to remove the listener when it's no longer needed.
    return () => {
      subscription.unsubscribe();
    };
  }, []); // The empty array ensures this effect runs only once when the app starts.

  const signOut = async () => {
    await supabase.auth.signOut();
    // Using window.location.href ensures a full page refresh, clearing all state.
    window.location.href = '/';
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  // CRITICAL FIX: We do not render the rest of the application (`children`)
  // until the initial authentication check is complete (`loading` is false).
  // This prevents all the race conditions and deadlocks we have been seeing.
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
