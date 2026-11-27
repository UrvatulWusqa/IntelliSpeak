import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, setRememberMe } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      console.error('Could not load profile', error);
      return null;
    }
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
        // Defer so we don't call Supabase inside its own callback.
        setTimeout(() => loadProfile(newSession?.user.id), 0);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      recoveryMode,
      setRecoveryMode,
      refreshProfile: () => loadProfile(session?.user.id),
      setProfile,
      signIn: async ({ email, password, remember }) => {
        setRememberMe(remember);
        return supabase.auth.signInWithPassword({ email, password });
      },
      signUp: async ({ email, password, fullName }) =>
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        }),
      signInWithGoogle: async () => {
        setRememberMe(true);
        return supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/dashboard` },
        });
      },
      sendPasswordReset: async (email) =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      updatePassword: async (password) => supabase.auth.updateUser({ password }),
      signOut: async () => supabase.auth.signOut(),
    }),
    [session, profile, loading, recoveryMode, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
