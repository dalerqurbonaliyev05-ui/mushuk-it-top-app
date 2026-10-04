import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface Props {
  profile: Profile;
  firstTime?: boolean;
  onDone: () => void;
  onCancel?: () => void;
}

/** Birinchi kirishda (va keyin «Profil»da) ism-sharif va qo'shimcha ma'lumotlarni to'ldirish. */
export function ProfileForm({ profile, firstTime, onDone, onCancel }: Props) {
  const [name, setName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 3 || !n.includes(' ')) { setErr('Ism va familiyangizni to\'liq kiriting (masalan: Ali Valiyev)'); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.from('profiles')
      .update({ full_name: n, phone: phone.trim() || null, city: city.trim() || null, bio: bio.trim() || null, onboarded: true })
      .eq('user_id', profile.user_id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onDone();
  }

  return (
    <div className={firstTime ? 'center-screen form-screen' : 'form-wrap'}>
      <h2>{firstTime ? 'Profilingizni to\'ldiring' : 'Profilni tahrirlash'}</h2>
      {firstTime && <p className="muted">Boshqa foydalanuvchilar sizni shu ism bilan ko&apos;radi.</p>}
      <form onSubmit={save} className="form">
        {err && <div className="alert err">{err}</div>}
        <label>Ism-sharif *<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" required /></label>
        <label>Telefon<input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} inputMode="tel" placeholder="+998 90 123 45 67" autoComplete="tel" /></label>
        <label>Shahar / tuman<input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} placeholder="Toshkent, Chilonzor" /></label>
        <label>O&apos;zingiz haqingizda<textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} placeholder="Ixtiyoriy" /></label>
        <button className="btn" disabled={busy}>{busy ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Bekor qilish</button>}
      </form>
    </div>
  );
}
