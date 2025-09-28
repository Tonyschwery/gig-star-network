// FILE: src/hooks/useAuth.ts

import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserStatus = 'LOADING' | 'LOGGED_OUT' | 'BOOKER' | 'TALENT_NEEDS_ONBOARDING' | 'TALENT_COMPLETE' | 'ADMIN';
type UserMode = 'booking' | 'artist';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  status: UserStatus;
  profile: any | null; // This will hold either a talent or booker profile
  signOut: () => Promise<void>;
  mode: UserMode;
  setMode: (mode: UserMode) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [status, setStatus] = useState<UserStatus>('LOADING');
  const [mode, setMode] = useState<UserMode>('booking');

  // Add loading timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('[AUTH] Loading timeout reached, forcing completion');
        setLoading(false);
        setStatus('LOGGED_OUT');
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    let isInitialLoad = true;
    let cleanup = false;
    
    console.log('[AUTH] Setting up auth state listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cleanup) return;
      
      console.log('[AUTH] Auth state change:', { event, hasSession: !!session, userId: session?.user?.id });
      
      const currentUser = session?.user ?? null;
      const hasUserChanged = user?.id !== currentUser?.id;
      
      // Only show loading for initial load or actual user changes
      if (isInitialLoad || hasUserChanged || event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        console.log('[AUTH] Setting loading to true');
        setLoading(true);
      }
      
      setSession(session);
      setUser(currentUser);

      if (!currentUser) {
        console.log('[AUTH] No user, setting LOGGED_OUT');
        setStatus('LOGGED_OUT');
        setProfile(null);
        setLoading(false);
        isInitialLoad = false;
        return;
      }

      try {
        // Unified Role Checking Logic with timeout
        if (currentUser.email === 'admin@qtalent.live') {
          console.log('[AUTH] Admin user detected');
          setStatus('ADMIN');
          setProfile({ full_name: 'Admin' });
          setLoading(false);
        } else {
          console.log('[AUTH] Checking user profiles...');
          
          // Add timeout to prevent hanging
          const profileTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile query timeout')), 5000)
          );
          
          try {
            // Check for a talent profile first
            const talentQuery = supabase.from('talent_profiles').select('*').eq('user_id', currentUser.id).maybeSingle();
            const { data: talentProfile } = await Promise.race([talentQuery, profileTimeout]) as any;
            
            if (talentProfile) {
              console.log('[AUTH] Talent profile found:', !!talentProfile.artist_name);
              setProfile(talentProfile);
              setStatus(talentProfile.artist_name ? 'TALENT_COMPLETE' : 'TALENT_NEEDS_ONBOARDING');
              setMode('artist');
            } else {
              console.log('[AUTH] No talent profile, checking booker profile...');
              // If not a talent, check for a booker profile
              const bookerQuery = supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
              const { data: bookerProfile } = await Promise.race([bookerQuery, profileTimeout]) as any;
              
              if (bookerProfile) {
                console.log('[AUTH] Booker profile found');
                setProfile(bookerProfile);
                setStatus('BOOKER');
              } else {
                console.log('[AUTH] No profiles found, defaulting to BOOKER');
                // Create a basic booker profile if none exists
                setProfile({ id: currentUser.id, email: currentUser.email });
                setStatus('BOOKER');
              }
            }
          } catch (error) {
            console.warn('[AUTH] Profile query failed:', error);
            // Fallback to booker if queries fail
            setProfile({ id: currentUser.id, email: currentUser.email });
            setStatus('BOOKER');
          }
        }
      } catch (error) {
        console.error('[AUTH] Error in auth state change:', error);
        setStatus('LOGGED_OUT');
      } finally {
        console.log('[AUTH] Setting loading to false');
        setLoading(false);
        isInitialLoad = false;
      }
    });

    return () => {
      cleanup = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Clear auth-related data
      setLoading(true);
      setUser(null);
      setSession(null);
      setProfile(null);
      setStatus('LOGGED_OUT');
      
      // Clear cache but don't force reload
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.active?.postMessage({ type: 'CLEAR_DYNAMIC_CACHE' });
        });
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Signout error:', error);
        // Just log the error, don't force reload
      }
    } catch (error) {
      console.error('Error during signout:', error);
      // Don't force reload, let the app handle gracefully
    } finally {
      setLoading(false);
    }
  };

  const value = { user, session, loading, status, profile, signOut, mode, setMode };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}