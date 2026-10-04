import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { uz, type Key } from './uz';
import { en } from './en';
import { ru } from './ru';

export type Lang = 'uz' | 'en' | 'ru';
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'uz', label: "O'zbekcha" },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];
const DICTS: Record<Lang, Record<Key, string>> = { uz, en, ru };
const STORE = 'mi_lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORE);
    if (saved === 'uz' || saved === 'en' || saved === 'ru') return saved;
  } catch { /* xotira yopiq bo'lishi mumkin */ }
  const n = (navigator.language || 'uz').slice(0, 2).toLowerCase();
  return n === 'ru' ? 'ru' : n === 'en' ? 'en' : 'uz';
}

let current: Lang = detect();
if (typeof document !== 'undefined') document.documentElement.lang = current;

function fmt(s: string, vars?: Record<string, string | number>): string {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : s;
}

export const currentLang = (): Lang => current;

/** Hook'siz tarjima (kutubxona fayllaridagi xato matnlari uchun): joriy tilni ishlatadi. */
export function tr(key: Key, vars?: Record<string, string | number>): string {
  return fmt(DICTS[current][key] ?? uz[key], vars);
}

const AGO: Record<Lang, { now: string; m: (n: number) => string; h: (n: number) => string; d: (n: number) => string }> = {
  uz: { now: 'hozir', m: (n) => `${n} daqiqa oldin`, h: (n) => `${n} soat oldin`, d: (n) => `${n} kun oldin` },
  en: { now: 'just now', m: (n) => `${n} min ago`, h: (n) => `${n} h ago`, d: (n) => `${n} d ago` },
  ru: { now: 'только что', m: (n) => `${n} мин. назад`, h: (n) => `${n} ч. назад`, d: (n) => `${n} дн. назад` },
};

/** "2 soat oldin" / "2 h ago" / "2 ч. назад"; bir haftadan eski bo'lsa dd.mm.yyyy. */
export function timeAgo(iso: string, now = Date.now()): string {
  const a = AGO[current];
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return a.now;
  if (s < 3600) return a.m(Math.floor(s / 60));
  if (s < 86400) return a.h(Math.floor(s / 3600));
  if (s < 86400 * 7) return a.d(Math.floor(s / 86400));
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
}
const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);
  const setLang = useCallback((l: Lang) => {
    current = l;
    try { localStorage.setItem(STORE, l); } catch { /* ixtiyoriy */ }
    document.documentElement.lang = l;
    setLangState(l);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const t = useCallback((key: Key, vars?: Record<string, string | number>) => fmt(DICTS[lang][key] ?? uz[key], vars), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('I18nProvider yo\'q');
  return v;
};

export type { Key };
