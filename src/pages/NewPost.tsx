import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { takePhoto } from '../lib/camera';
import { compressImage } from '../lib/image';
import { GeoError, ensureLocationPermission, fmtCoords, getPosition, reverseGeocode, type Fix } from '../lib/geo';
import { createPost } from '../lib/posts';
import { ANIMAL, type AnimalType } from '../lib/types';

interface Shot { blob: Blob; url: string; fix: Fix | null; address: string | null; geoError: string | null }

/**
 * Yangi e'lon: 1) kategoriya (mushuk/it) tugmasi, 2) kamera, 3) rasm olingan zahoti GPS joylashuvi avtomatik olinadi
 * va saqlanadi, 4) ixtiyoriy izoh, yuborish.
 */
export function NewPostPage({ onPosted }: { onPosted: () => void }) {
  const { session } = useAuth();
  const [animal, setAnimal] = useState<AnimalType | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState<'idle' | 'camera' | 'locating' | 'sending'>('idle');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  async function locate(): Promise<Pick<Shot, 'fix' | 'address' | 'geoError'>> {
    try {
      const fix = await getPosition();
      return { fix, address: await reverseGeocode(fix.lat, fix.lng), geoError: null };
    } catch (e) {
      return { fix: null, address: null, geoError: e instanceof GeoError || e instanceof Error ? e.message : String(e) };
    }
  }

  async function capture(kind: AnimalType) {
    setAnimal(kind); setErr(null);
    try {
      await ensureLocationPermission();           // avval ruxsat: kamera yopilgach darhol GPS olinadi
      setStep('camera');
      const raw = await takePhoto();
      if (!raw) { setStep('idle'); return; }
      setStep('locating');
      const [img, geo] = await Promise.all([compressImage(raw), locate()]);   // rasm olingan joyda: darhol joylashuv
      setShot((old) => { if (old) URL.revokeObjectURL(old.url); return { blob: img, url: URL.createObjectURL(img), ...geo }; });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setStep('idle');
  }

  async function retryLocation() {
    if (!shot) return;
    setStep('locating'); setErr(null);
    const geo = await locate();
    setShot({ ...shot, ...geo });
    setStep('idle');
  }

  async function send() {
    if (!shot || !shot.fix || !animal || !session) return;
    setStep('sending'); setErr(null);
    try {
      await createPost({ userId: session.user.id, animal, image: shot.blob, lat: shot.fix.lat, lng: shot.fix.lng, address: shot.address, caption });
      setShot(null); setCaption(''); setAnimal(null);
      onPosted();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setStep('idle'); }
  }

  const busy = step !== 'idle';

  if (!shot) {
    return (
      <div>
        <h2>Yangi e&apos;lon</h2>
        <p className="muted">Hayvonni tanlang, kamera ochiladi. Rasm olingan joyning GPS joylashuvi avtomatik saqlanadi.</p>
        {err && <div className="alert err">{err}</div>}
        <div className="cat-buttons">
          {(Object.keys(ANIMAL) as AnimalType[]).map((k) => (
            <button key={k} className="cat-btn" disabled={busy} onClick={() => void capture(k)}>
              <span className="big">{ANIMAL[k].icon}</span>{ANIMAL[k].label}
            </button>
          ))}
        </div>
        {step === 'camera' && <div className="center muted pad">Kamera ochilmoqda...</div>}
        {step === 'locating' && <div className="center muted pad"><div className="spinner" />Joylashuv aniqlanmoqda...</div>}
      </div>
    );
  }

  return (
    <div>
      <h2>E&apos;lonni tasdiqlang</h2>
      <img className="post-img preview" src={shot.url} alt="Olingan rasm" />
      <div className="seg">
        {(Object.keys(ANIMAL) as AnimalType[]).map((k) => (
          <button key={k} className={animal === k ? 'on' : ''} disabled={busy} onClick={() => setAnimal(k)}>{ANIMAL[k].icon} {ANIMAL[k].label}</button>
        ))}
      </div>
      <div className="loc solo">
        {shot.fix ? (
          <div className="loc-text">📍 {shot.address ?? 'Manzil aniqlanmagan'}<div className="muted small">{fmtCoords(shot.fix.lat, shot.fix.lng)}{shot.fix.accuracy ? ` · ±${Math.round(shot.fix.accuracy)} m` : ''}</div></div>
        ) : (
          <div className="loc-text"><span className="bad">📍 Joylashuv olinmadi.</span><div className="muted small">{shot.geoError}</div></div>
        )}
        <button className="btn small ghost" disabled={busy} onClick={() => void retryLocation()}>{step === 'locating' ? '...' : '↻'}</button>
      </div>
      <label className="field">Izoh (ixtiyoriy)
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} rows={3} placeholder="Masalan: yo'lak yonida, tuyg'un ko'rinadi, ovqat berdim" />
      </label>
      {err && <div className="alert err">{err}</div>}
      <button className="btn block" disabled={busy || !shot.fix || !animal} onClick={() => void send()}>{step === 'sending' ? 'Yuborilmoqda...' : 'E\'lon qilish'}</button>
      <button className="btn ghost block" disabled={busy} onClick={() => void capture(animal ?? 'cat')}>📷 Qayta suratga olish</button>
      <button className="btn ghost block" disabled={busy} onClick={() => { setShot(null); setAnimal(null); }}>Bekor qilish</button>
    </div>
  );
}
