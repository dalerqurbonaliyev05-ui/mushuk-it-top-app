import { useEffect, useState } from 'react';
import { Icon } from '../components/Icons';
import { useAuth } from '../lib/auth';
import { useMyLocation } from '../lib/location';
import { takePhoto } from '../lib/camera';
import { compressImage } from '../lib/image';
import { GeoError, ensureLocationPermission, fmtCoords, getPosition, reverseGeocode, type Fix } from '../lib/geo';
import { createPost } from '../lib/posts';
import { ANIMAL, type AnimalType } from '../lib/types';

interface Shot { blob: Blob; thumb: Blob; url: string; fix: Fix | null; address: string | null; geoError: string | null }

/**
 * Yangi e'lon: 1) kategoriya (mushuk/it) tugmasi, 2) kamera, 3) rasm olingan zahoti GPS joylashuvi avtomatik olinadi
 * va saqlanadi, 4) sarlavha va izoh (ixtiyoriy), yuborish.
 */
export function NewPostPage({ onPosted }: { onPosted: () => void }) {
  const { session } = useAuth();
  const { refresh } = useMyLocation();
  const [animal, setAnimal] = useState<AnimalType | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState<'idle' | 'camera' | 'locating' | 'sending'>('idle');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  async function locate(): Promise<Pick<Shot, 'fix' | 'address' | 'geoError'>> {
    try {
      const fix = await getPosition();
      void refresh();   // umumiy joylashuvni ham yangilaymiz (masofalar uchun)
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
      const [img, thumb, geo] = await Promise.all([compressImage(raw), compressImage(raw, 320, 0.7), locate()]);   // rasm olingan joyda: darhol joylashuv
      setShot((old) => { if (old) URL.revokeObjectURL(old.url); return { blob: img, thumb, url: URL.createObjectURL(img), ...geo }; });
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
      await createPost({ userId: session.user.id, animal, title, image: shot.blob, thumb: shot.thumb, lat: shot.fix.lat, lng: shot.fix.lng, address: shot.address, caption });
      setShot(null); setTitle(''); setCaption(''); setAnimal(null);
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
        <div className="tiles big">
          {(Object.keys(ANIMAL) as AnimalType[]).map((k) => (
            <button key={k} className={`tile ${k}`} disabled={busy} onClick={() => void capture(k)}>
              <span className="emo">{ANIMAL[k].icon}</span>{ANIMAL[k].label}
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
          <button key={k} className={animal === k ? `on ${k}` : ''} disabled={busy} onClick={() => setAnimal(k)}>{ANIMAL[k].icon} {ANIMAL[k].label}</button>
        ))}
      </div>
      <div className="loc solo">
        {shot.fix ? (
          <div className="loc-text"><Icon name="pin" size={16} /> {shot.address ?? 'Manzil aniqlanmagan'}<div className="muted small">{fmtCoords(shot.fix.lat, shot.fix.lng)}{shot.fix.accuracy ? ` · ±${Math.round(shot.fix.accuracy)} m` : ''}</div></div>
        ) : (
          <div className="loc-text"><span className="bad">Joylashuv olinmadi.</span><div className="muted small">{shot.geoError}</div></div>
        )}
        <button className="btn small ghost" disabled={busy} onClick={() => void retryLocation()} aria-label="Joylashuvni qayta aniqlash"><Icon name="locate" size={17} /></button>
      </div>
      <label className="field">Sarlavha
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Masalan: Chiroyli oq mushuk" />
      </label>
      <label className="field">Izoh (ixtiyoriy)
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} rows={3} placeholder="Masalan: yo'lak yonida, qo'rqmaydi, ovqat berdim" />
      </label>
      {err && <div className="alert err">{err}</div>}
      <button className="btn block" disabled={busy || !shot.fix || !animal} onClick={() => void send()}>{step === 'sending' ? 'Yuborilmoqda...' : 'E\'lon qilish'}</button>
      <button className="btn ghost block" disabled={busy} onClick={() => void capture(animal ?? 'cat')}><Icon name="camera" size={17} /> Qayta suratga olish</button>
      <button className="btn ghost block" disabled={busy} onClick={() => { setShot(null); setAnimal(null); }}>Bekor qilish</button>
    </div>
  );
}
