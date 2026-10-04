import { ANIMAL, animalLabel, type AnimalType } from '../lib/types';
import { useI18n } from '../i18n';

/** Barchasi / Mushuk / It filtri. */
export function TypeChips({ value, onChange }: { value: AnimalType | null; onChange: (v: AnimalType | null) => void }) {
  const { t } = useI18n();
  return (
    <div className="chips" role="tablist">
      <button className={`chip-btn all ${value === null ? 'on' : ''}`} onClick={() => onChange(null)}>{t('common.all')}</button>
      <button className={`chip-btn cat ${value === 'cat' ? 'on' : ''}`} onClick={() => onChange('cat')}>{ANIMAL.cat.icon} {animalLabel('cat')}</button>
      <button className={`chip-btn dog ${value === 'dog' ? 'on' : ''}`} onClick={() => onChange('dog')}>{ANIMAL.dog.icon} {animalLabel('dog')}</button>
    </div>
  );
}

export function TypeBadge({ type }: { type: AnimalType }) {
  useI18n();   // til o'zgarganda qayta chizish
  return <span className={`badge ${type}`}>{ANIMAL[type].icon} {animalLabel(type)}</span>;
}
