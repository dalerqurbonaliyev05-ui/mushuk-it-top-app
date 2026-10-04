import type { ReactNode } from 'react';
import { Icon } from './Icons';
import { useI18n } from '../i18n';

/** To'liq ekranli sahifa sarlavhasi: orqaga tugmasi, nom, o'ng tomonda ixtiyoriy amal. */
export function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="hdr">
      <button className="icon-btn" onClick={onBack} aria-label={t('common.back')}><Icon name="back" /></button>
      <h2>{title}</h2>
      <div className="hdr-right">{right}</div>
    </header>
  );
}
