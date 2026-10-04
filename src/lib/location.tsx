import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { distanceKm, fmtDistance, getPosition, type Fix } from './geo';

type Status = 'loading' | 'ok' | 'error';
interface LocState {
  fix: Fix | null;
  status: Status;
  error: string | null;
  refresh: () => Promise<Fix | null>;
  /** Foydalanuvchigacha masofa matni (joylashuv noma'lum bo'lsa null). */
  distanceTo: (lat: number, lng: number) => string | null;
}

const Ctx = createContext<LocState | null>(null);
export const useMyLocation = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('LocationProvider yo\'q');
  return v;
};

/** Foydalanuvchining joriy joylashuvi (masofa va "yaqin atrofdagi" e'lonlar uchun). Ruxsat berilmasa ilova baribir ishlaydi. */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const busy = useRef<Promise<Fix | null> | null>(null);

  const refresh = useCallback((): Promise<Fix | null> => {
    if (busy.current) return busy.current;
    setStatus('loading');
    const p = getPosition()
      .then((f) => { setFix(f); setStatus('ok'); setError(null); return f; })
      .catch((e: unknown) => { setStatus('error'); setError(e instanceof Error ? e.message : String(e)); return null; })
      .finally(() => { busy.current = null; });
    busy.current = p;
    return p;
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const distanceTo = useCallback((lat: number, lng: number) => (fix ? fmtDistance(distanceKm(fix, { lat, lng })) : null), [fix]);
  const value = useMemo(() => ({ fix, status, error, refresh, distanceTo }), [fix, status, error, refresh, distanceTo]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
