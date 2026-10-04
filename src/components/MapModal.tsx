import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Sheet } from './Sheet';
import { fmtCoords, mapsUrl } from '../lib/geo';
import { openExternal } from '../lib/open';
import { useI18n } from '../i18n';

interface Props { lat: number; lng: number; address: string | null; onClose: () => void }

/** Ilova ichidagi xarita (OpenStreetMap + Leaflet) va Google Maps havolasi. */
export function MapModal({ lat, lng, address, onClose }: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { zoomControl: true, attributionControl: true }).setView([lat, lng], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    // Standart marker rasmlari bundler bilan buziladi: emoji divIcon ishlatamiz.
    L.marker([lat, lng], { icon: L.divIcon({ className: 'map-pin', html: '📍', iconSize: [32, 32], iconAnchor: [16, 30] }) }).addTo(map);
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => { clearTimeout(t); map.remove(); };
  }, [lat, lng]);
  return (
    <Sheet title={t('map.modalTitle')} onClose={onClose}>
      <div ref={ref} className="map" />
      <p className="loc-line">📍 {address ?? t('common.noAddress')}<br /><span className="muted">{fmtCoords(lat, lng)}</span></p>
      <button className="btn" onClick={() => void openExternal(mapsUrl(lat, lng))}>{t('detail.openMaps')}</button>
    </Sheet>
  );
}
