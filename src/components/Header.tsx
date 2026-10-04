import type { ReactNode } from 'react';
import { Icon } from './Icons';

/** To'liq ekranli sahifa sarlavhasi: orqaga tugmasi, nom, o'ng tomonda ixtiyoriy amal. */
export function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="hdr">
      <button className="icon-btn" onClick={onBack} aria-label="Orqaga"><Icon name="back" /></button>
      <h2>{title}</h2>
      <div className="hdr-right">{right}</div>
    </header>
  );
}
