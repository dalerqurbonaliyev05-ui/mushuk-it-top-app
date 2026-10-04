import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AnimalType } from './types';

/** Tab ustidan ochiladigan to'liq ekranli sahifalar (orqaga tugmasi bilan yopiladi). */
export type Screen =
  | { name: 'post'; id: string }
  | { name: 'all'; type?: AnimalType | null; q?: string }
  | { name: 'myPosts' }
  | { name: 'favorites' }
  | { name: 'myComments' }
  | { name: 'settings' }
  | { name: 'help' };

interface Nav {
  stack: Screen[];
  push: (s: Screen) => void;
  pop: () => void;
  reset: () => void;
  openPost: (id: string) => void;
}

const Ctx = createContext<Nav | null>(null);
export const useNav = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('NavProvider yo\'q');
  return v;
};

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([]);
  const push = useCallback((s: Screen) => setStack((l) => [...l, s]), []);
  const pop = useCallback(() => setStack((l) => l.slice(0, -1)), []);
  const reset = useCallback(() => setStack([]), []);
  const openPost = useCallback((id: string) => push({ name: 'post', id }), [push]);
  const value = useMemo(() => ({ stack, push, pop, reset, openPost }), [stack, push, pop, reset, openPost]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
