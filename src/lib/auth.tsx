import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { NATIVE_REDIRECT, isConfigured } from './config';
import { isNative, supabase } from './supabase';
import type { Profile } from './types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider yo\'q');
  return v;
};

async function fetchProfile(userId: string): Promise<Profile | null> {
  // Profilni trigger yaratadi; ro'yxatdan o'tgan zahoti hali yetib kelmagan bo'lishi mumkin: bir necha marta urinamiz.
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (data) return data as Profile;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return; }
    try { setProfile(await fetchProfile(s.user.id)); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      // onAuthStateChange ichida supabase chaqiruvlarini kutmaslik tavsiya etiladi: keyingi tikda bajaramiz.
      setTimeout(() => { void loadProfile(s); }, 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  // Android: Google tizim brauzerida tugagach uz.mushukit.top://auth/callback?code=... bilan ilovaga qaytadi.
  useEffect(() => {
    if (!isNative) return;
    const h = CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith(NATIVE_REDIRECT)) return;
      try { await Browser.close(); } catch { /* yopiq bo'lishi mumkin */ }
      const q = new URL(url).searchParams;
      const code = q.get('code');
      const err = q.get('error_description') || q.get('error');
      if (err) { setError(err); return; }
      if (!code) return;
      const { error: e } = await supabase.auth.exchangeCodeForSession(code);
      if (e) setError(e.message);
    });
    return () => { void h.then((x) => x.remove()); };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const { data, error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: isNative
        ? { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true }
        : { redirectTo: window.location.origin + window.location.pathname },
    });
    if (e) { setError(e.message); return; }
    if (isNative && data.url) await Browser.open({ url: data.url });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null); setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => { await loadProfile(session); }, [loadProfile, session]);

  const value = useMemo(
    () => ({ session, profile, loading, error, signInWithGoogle, signOut, refreshProfile }),
    [session, profile, loading, error, signInWithGoogle, signOut, refreshProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
