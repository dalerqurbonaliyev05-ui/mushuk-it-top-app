import type { ReactNode } from 'react';

/** Pastdan chiqadigan oyna (izohlar, xarita). Fonni bosish yoki ✕ bilan yopiladi. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head"><b>{title}</b><button className="x" onClick={onClose} aria-label="Yopish">✕</button></div>
        {children}
      </div>
    </div>
  );
}
