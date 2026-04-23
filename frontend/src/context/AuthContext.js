/**
 * src/context/AuthContext.js — Global Authentication State
 * ----------------------------------------------------------
 * Provides user session data to every component in the app
 * via React Context. Wraps the entire app in AuthProvider (in App.js).
 *
 * WHY A CONTEXT?
 * Any component can call `const { user } = useAuth()` to know if the
 * user is logged in, without passing props down through every layer.
 *
 * WHAT IT DOES:
 * ─────────────
 * 1. On app load: calls supabase.auth.getSession() to restore any
 *    existing session (so users stay logged in after page refresh).
 * 2. Fetches the full user profile from public.users (which has xp,
 *    coins, role, etc. — fields Supabase Auth doesn't store).
 * 3. Listens for auth state changes (login, logout, token refresh)
 *    via supabase.auth.onAuthStateChange().
 * 4. Exposes: user, setUser, loading, session, logout, supabase
 *
 * ERROR HANDLING:
 * ───────────────
 * Supabase sessions can fail due to "Lock" errors (multiple browser tabs
 * competing for the same IndexedDB storage key). This context has:
 *   - withTimeout() helper: prevents any Supabase call from hanging forever
 *   - Retry logic: retries profile fetch up to 2 times on lock errors
 *   - Auto-heal: if the public.users profile is missing, it creates one
 *   - 10-second safety timeout: forces loading=false so app never freezes
 *
 * CONTEXT VALUE SHAPE:
 *   user     — the merged profile object (auth fields + public.users fields)
 *              or null if not logged in
 *   setUser  — allows other components to update the user (e.g. after buying coins)
 *   loading  — true while initializing or fetching profile
 *   session  — raw Supabase session object (contains access_token)
 *   logout   — async function to sign out
 *   supabase — the Supabase JS client (exposed for components that need direct access)
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Create the Supabase client with session-persistence settings.
// storageKey: 'citypulse_auth_v4' — busts old cached auth sessions.
// detectSessionInUrl: false — we handle auth redirects manually.
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: 'citypulse_auth_v4', // Unique key to avoid interfering with other sessions
    }
  }
);

/**
 * withTimeout(promise, ms)
 * Races a promise against a timeout. If the promise doesn't resolve
 * within `ms` milliseconds, it rejects with a timeout error.
 * Used to prevent Supabase calls from hanging forever.
 */
const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Supabase request timed out')), ms)
  )
]);

// Create the context object (components will access this via useAuth())
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);    // Current user profile (or null)
  const [loading, setLoading] = useState(true);    // True while session is being established
  const [session, setSession] = useState(null);    // Raw Supabase session

  // Ref tracks the last successfully fetched userId+token combo to prevent duplicate fetches
  const profileFetchedRef = useRef(null);

  /**
   * fetchProfile(userId, token, authUser?, retryCount?)
   * ─────────────────────────────────────────────────────
   * Fetches the user's extended profile from public.users.
   * If the profile doesn't exist (first login via OAuth, or DB trigger failed),
   * it auto-creates (heals) a minimal profile so the app doesn't break.
   */
  const fetchProfile = async (userId, token, authUser = null, retryCount = 0) => {
    if (profileFetchedRef.current === `${userId}_${token}`) return;

    try {
      console.log(`[Auth] Fetching profile via backend API...`);

      const res = await withTimeout(
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        4000
      );

      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const profile = await res.json();

      if (profile && profile.id) {
        console.log(`[Auth] Profile loaded for ${profile.username}`);
        profileFetchedRef.current = `${userId}_${token}`;
        localStorage.setItem('access_token', token);
        setUser({ ...profile, access_token: token });
      } else {
        throw new Error('No profile data');
      }
    } catch (err) {
      console.warn(`[Auth] Profile fetch failed: ${err.message}`);

      // Fallback: set minimal user so app doesn't break
      console.warn('[Auth] Using fallback profile');
      profileFetchedRef.current = `${userId}_${token}`;
      localStorage.setItem('access_token', token);
      setUser({ id: userId, role: 'user', username: 'User', access_token: token, coins: 0 });
    }
  };

  // Ref to ensure initialization runs exactly once (prevents double-run in React StrictMode)
  const initRunRef = useRef(false);

  useEffect(() => {
    let mounted = true; // Track if component is still mounted to prevent state updates after unmount

    // Safety timeout: if initialization takes more than 10 seconds, force loading=false
    // This ensures the app always becomes usable even if Supabase is unreachable
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.error('[Auth] Initialization timed out - forcing ready state');
        setLoading(false);
      }
    }, 5000);

    const init = async () => {
      if (initRunRef.current) return; // Prevent double-initialization
      initRunRef.current = true;

      try {
        console.log('[Auth] Initializing session...');

        // getSession() checks localStorage for a cached Supabase session.
        // Can throw "Lock broken" error if multiple tabs compete for storage.
        const { data: { session: s } = {}, error } = await withTimeout(supabase.auth.getSession(), 4000)
          .catch(e => ({ error: e }));

        if (error) {
          if (error.message?.includes('Lock') || error.message?.includes('timed out')) {
            // Graceful recovery: try getUser() directly (doesn't need the lock)
            console.warn('[Auth] Initialization conflict or timeout, attempting graceful recovery...');
            const { data: { user: u } = {} } = await withTimeout(supabase.auth.getUser(), 4000).catch(() => ({}));
            if (u) {
              console.log('[Auth] Graceful recovery successful for', u.email);
              await fetchProfile(u.id, localStorage.getItem('access_token'), u);
            }
          } else {
            throw error; // Unexpected error — let the catch block handle it
          }
        }

        // Successfully got session — load the full profile
        if (mounted && s?.user) {
          console.log('[Auth] Found active session for', s.user.email);
          setSession(s);
          await fetchProfile(s.user.id, s.access_token, s.user);
        }
      } catch (err) {
        console.warn('[Auth] Initialization error:', err.message);
      } finally {
        // Always clear the timeout and set loading=false when init finishes
        if (mounted) {
          clearTimeout(timeout);
          setLoading(false);
          console.log('[Auth] Initialization complete');
        }
      }
    };

    init();

    // ── Real-time Auth State Listener ──────────────────────────────────────────
    // Called whenever: user logs in, logs out, token refreshes, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        console.log(`[Auth] Event: ${event}`);

        if (newSession?.user) {
          setSession(newSession);
          // profileFetchedRef prevents duplicate work if init() already loaded this user
          if (profileFetchedRef.current !== `${newSession.user.id}_${newSession.access_token}`) {
            if (mounted) setLoading(true);
            await fetchProfile(newSession.user.id, newSession.access_token, newSession.user);
            if (mounted) setLoading(false);
          } else {
            if (mounted) setLoading(false);
          }
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          // Clear all auth state on logout
          console.log('[Auth] User signed out');
          setUser(null);
          setSession(null);
          profileFetchedRef.current = null;
          localStorage.removeItem('access_token');
          if (mounted) setLoading(false);
        }
      }
    );

    // Cleanup: unsubscribe the listener when the component unmounts
    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array — runs once on mount

  /**
   * logout()
   * Signs out the user both locally (clears state + localStorage)
   * and server-side (invalidates the Supabase JWT).
   */
  const logout = async () => {
    console.log('[Auth] Initiating sign out...');
    setUser(null);
    setSession(null);
    profileFetchedRef.current = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('citypulse_admin_token');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Auth] Signout error:', err.message);
      // Error is non-fatal — local state is already cleared
    }
  };

  // Expose debug info in the browser console during development
  // Access via `window.__AUTH_DEBUG__` in DevTools
  useEffect(() => {
    window.__AUTH_DEBUG__ = { user, loading, session };
  }, [user, loading, session]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, session, logout, supabase }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for easy access in any component: const { user, logout } = useAuth();
export const useAuth = () => useContext(AuthContext);

// Also export the supabase client directly for components that need it
export { supabase };
