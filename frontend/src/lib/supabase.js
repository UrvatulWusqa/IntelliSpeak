import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

const REMEMBER_KEY = 'intellispeak.rememberMe';

export function setRememberMe(remember) {
  window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
}

function rememberMe() {
  // Default to remembering, which matches Supabase's default behaviour.
  return window.localStorage.getItem(REMEMBER_KEY) !== '0';
}

// FR1.3 Remember me: keep the session in localStorage (survives browser
// restarts) when checked, otherwise in sessionStorage (cleared when the
// browser closes).
const authStorage = {
  getItem: (key) => window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key),
  setItem: (key, value) => {
    const [keep, drop] = rememberMe()
      ? [window.localStorage, window.sessionStorage]
      : [window.sessionStorage, window.localStorage];
    keep.setItem(key, value);
    drop.removeItem(key);
  },
  removeItem: (key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
