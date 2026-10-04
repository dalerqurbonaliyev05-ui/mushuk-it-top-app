import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Icon } from '../components/Icons';
import { Thumb } from '../components/Thumb';
import { TypeChips, TypeBadge } from '../components/Chips';
import { useAuth } from '../lib/auth';
import { useMyLocation } from '../lib/location';
import { useNav } from '../lib/nav';
import { fetchMapPosts, thumbUrl, type FeedPost } from '../lib/posts';
import { distanceKm } from '../lib/geo';
import { timeAgo } from '../lib/format';
import { postTitle, type AnimalType } from '../lib/types';

const TASHKENT: [number, number] = [41.3111, 69.2797];
const MAX_PINS = 80;

function pinIcon(p: FeedPost, selected: boolean): L.DivIcon {
  // DOM yaratamiz (HTML satri emas): foydalanuvchi ma'lumotlari hech qachon HTML sifatida talqin qilinmaydi.
  const el = document.createElement('div');
  el.className = `photo-pin ${p.animal_type}${selected ? ' sel' : ''}`;
  const img = document.createElement('img');
  img.alt = '';
  img.src = thumbUrl(p.image_url);
  img.onerror = () => { img.onerror = null; img.src = p.image_url; };
  el.appendChild(img);
  return L.divIcon({ className: 'pin-wrap', html: el, iconSize: [44, 52], iconAnchor: [22, 50] });
}

/** Xarita: e'lonlar rasmli pinlar bilan, tur filtri, qidiruv, "men turgan joy" tugmasi va tanlangan e'lon kartasi. */
export function MapPage() {
  const { session } = useAuth();
  const me = session!.user.id;
  const nav = useNav();
  const { fix, refresh } = useMyLocation();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [type, setType] = useState<AnimalType | null>(null);
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const meMarker = useRef<L.CircleMarker | null>(null);
  const centered = useRef(false);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = posts.filter((p) => (!type || p.animal_type === type)
      && (!t || `${p.title ?? ''} ${p.caption ?? ''} ${p.address ?? ''}`.toLowerCase().includes(t)));
    if (fix) list = list.map((p) => ({ p, d: distanceKm(fix, { lat: p.latitude, lng: p.longitude }) })).sort((a, b) => a.d - b.d).map((x) => x.p);
    return list.slice(0, MAX_PINS);
  }, [posts, type, q, fix]);
  const selected = shown.find((p) => p.id === selId) ?? shown[0] ?? null;

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { zoomControl: false, attributionControl: true }).setView(TASHKENT, 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; layer.current = null; meMarker.current = null; };
  }, []);

  useEffect(() => {
    fetchMapPosts(me).then(setPosts).catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, [me]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    for (const p of shown) {
      L.marker([p.latitude, p.longitude], { icon: pinIcon(p, p.id === selected?.id), zIndexOffset: p.id === selected?.id ? 1000 : 0 })
        .on('click', () => setSelId(p.id)).addTo(g);
    }
  }, [shown, selected?.id]);

  useEffect(() => {
    const m = map.current;
    if (!m || !fix) return;
    meMarker.current?.remove();
    meMarker.current = L.circleMarker([fix.lat, fix.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(m);
    if (!centered.current) { centered.current = true; m.setView([fix.lat, fix.lng], 14); }
  }, [fix]);

  async function locate() {
    const f = fix ?? (await refresh());
    if (f && map.current) map.current.flyTo([f.lat, f.lng], 15);
  }

  return (
    <div className="map-page">
      <div ref={box} className="map-full" />
      <div className="map-top">
        <div className="search floating"><Icon name="search" size={19} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bu yerda qidirish..." aria-label="Xaritada qidirish" /></div>
        <TypeChips value={type} onChange={setType} />
      </div>
      <button className="locate" onClick={() => void locate()} aria-label="Mening joylashuvim"><Icon name="locate" /></button>
      {err && <div className="alert err map-err">{err}</div>}
      {selected && (
        <div className="map-card">
          <Thumb url={selected.image_url} className="row-img" alt={postTitle(selected)} />
          <div className="row-body">
            <div className="row-top"><TypeBadge type={selected.animal_type} /><span className="likes"><Icon name="heart" size={15} fill /> {selected.likes[0]?.count ?? 0}</span></div>
            <b className="row-title ellip">{postTitle(selected)}</b>
            <div className="muted small ellip">{selected.address ?? 'Manzil aniqlanmagan'}</div>
            <div className="muted small">{timeAgo(selected.created_at)}</div>
            <button className="btn ok small" onClick={() => nav.openPost(selected.id)}><Icon name="pin" size={15} /> Lokatsiyani ko&apos;rish</button>
          </div>
        </div>
      )}
      {!selected && posts.length > 0 && <div className="map-card empty-card">Bu filtr bo&apos;yicha e&apos;lon topilmadi</div>}
    </div>
  );
}
