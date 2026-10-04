import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { currentLang, tr } from '../i18n';

export interface Fix { lat: number; lng: number; accuracy: number | null }

export class GeoError extends Error {
  constructor(public kind: 'denied' | 'unavailable' | 'timeout', message: string) { super(message); }
}

/** Joylashuv ruxsatini so'raydi (Android). Ruxsat berilmasa GeoError('denied'). */
export async function ensureLocationPermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;   // brauzer ruxsatni getCurrentPosition vaqtida so'raydi
  let p = await Geolocation.checkPermissions();
  if (p.location !== 'granted' && p.coarseLocation !== 'granted') p = await Geolocation.requestPermissions({ permissions: ['location'] });
  if (p.location !== 'granted' && p.coarseLocation !== 'granted') {
    throw new GeoError('denied', tr('err.locDenied'));
  }
}

/** Hozirgi GPS joylashuvi (yuqori aniqlik). */
export async function getPosition(): Promise<Fix> {
  await ensureLocationPermission();
  try {
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 });
    return { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? null };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/denied|permission/i.test(m)) throw new GeoError('denied', tr('err.locDenied2'));
    if (/timeout|timed out/i.test(m)) throw new GeoError('timeout', tr('err.locTimeout'));
    throw new GeoError('unavailable', tr('err.locUnavailable'));
  }
}

/** Koordinatadan qisqa manzil (OpenStreetMap Nominatim). Xato bo'lsa null: post baribir koordinata bilan saqlanadi. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=${currentLang()},uz,ru,en&lat=${lat}&lon=${lng}`, { signal: ctl.signal });
    if (!r.ok) return null;
    const j = (await r.json()) as { display_name?: string; address?: Record<string, string> };
    const a = j.address ?? {};
    const parts = [a.road || a.pedestrian || a.neighbourhood, a.suburb || a.quarter || a.city_district, a.city || a.town || a.village || a.county]
      .filter((x, i, arr): x is string => !!x && arr.indexOf(x) === i);
    const s = parts.length ? parts.join(', ') : (j.display_name ?? '');
    return s ? s.slice(0, 280) : null;
  } catch { return null; }
  finally { clearTimeout(t); }
}

export const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const fmtCoords = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/** Ikki nuqta orasidagi masofa (km), Haversine. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function fmtDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} ${tr('unit.m')}`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} ${tr('unit.km')}`;
}
