import { ANIMAL, type AnimalType } from '../lib/types';

/** Barchasi / Mushuk / It filtri. */
export function TypeChips({ value, onChange }: { value: AnimalType | null; onChange: (v: AnimalType | null) => void }) {
  return (
    <div className="chips" role="tablist">
      <button className={`chip-btn all ${value === null ? 'on' : ''}`} onClick={() => onChange(null)}>Barchasi</button>
      <button className={`chip-btn cat ${value === 'cat' ? 'on' : ''}`} onClick={() => onChange('cat')}>{ANIMAL.cat.icon} {ANIMAL.cat.label}</button>
      <button className={`chip-btn dog ${value === 'dog' ? 'on' : ''}`} onClick={() => onChange('dog')}>{ANIMAL.dog.icon} {ANIMAL.dog.label}</button>
    </div>
  );
}

export function TypeBadge({ type }: { type: AnimalType }) {
  return <span className={`badge ${type}`}>{ANIMAL[type].icon} {ANIMAL[type].label}</span>;
}
