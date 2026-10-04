import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
const STORE = 'mi_theme';

function load(): ThemePref {
  try { const v = localStorage.getItem(STORE); if (v === 'light' || v === 'dark' || v === 'system') return v; } catch { /* ixtiyoriy */ }
  return 'system';
}
const systemDark = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && systemDark());
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0d1412' : '#16a34a');
}
apply(load());   // birinchi chizishdan oldin: yorug' "chaqnash" bo'lmasin

interface ThemeCtx { pref: ThemePref; setPref: (p: ThemePref) => void }
const Ctx = createContext<ThemeCtx | null>(null);
export const useTheme = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('ThemeProvider yo\'q');
  return v;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(load);
  const setPref = useCallback((p: ThemePref) => {
    try { localStorage.setItem(STORE, p); } catch { /* ixtiyoriy */ }
    setPrefState(p);
  }, []);
  useEffect(() => {
    apply(pref);
    if (pref !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => apply('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [pref]);
  const value = useMemo(() => ({ pref, setPref }), [pref, setPref]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
