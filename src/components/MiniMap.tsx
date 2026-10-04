import { useEffect, useRef } from 'react';
import L from 'leaflet';

/** Kichik, harakatsiz xarita (e'lon tafsilotlari uchun). */
export function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false })
      .setView([lat, lng], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, referrerPolicy: 'origin' }).addTo(map);
    L.marker([lat, lng], { icon: L.divIcon({ className: 'map-pin', html: '📍', iconSize: [32, 32], iconAnchor: [16, 30] }) }).addTo(map);
    return () => { map.remove(); };
  }, [lat, lng]);
  return <div ref={ref} className="mini-map" />;
}
