import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // FIX #4: Clear session expired state when user dismisses
  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // FIX #4: Listen for auth changes with proper token refresh handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State change:', event);

      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          // Successfully signed in or token refreshed
          setSession(session);
          setUser(session?.user ?? null);
          setSessionExpired(false);
          break;

        case 'SIGNED_OUT':
          setSession(null);
          setUser(null);
          break;

        case 'USER_UPDATED':
          setSession(session);
          setUser(session?.user ?? null);
          break;

        default:
          // Handle other events (INITIAL_SESSION, PASSWORD_RECOVERY, etc.)
          setSession(session);
          setUser(session?.user ?? null);
      }

      // FIX #4: Detect token refresh failure
      // If we had a user but now session is null without explicit sign out
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('[Auth] Token refresh failed - session expired');
        setSessionExpired(true);
      }
    });

    // FIX #4: Periodic session check to detect expiration
    const checkSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[Auth] Session check error:', error);
          if (user && !currentSession) {
            setSessionExpired(true);
            setSession(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('[Auth] Session check failed:', err);
      }
    };

    // Check session every 5 minutes
    const intervalId = setInterval(checkSession, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [user]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!user,
    // FIX #4: Expose session expiration state
    sessionExpired,
    clearSessionExpired,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
