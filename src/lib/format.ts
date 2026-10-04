export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'hozir';
  if (s < 3600) return `${Math.floor(s / 60)} daqiqa oldin`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} kun oldin`;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

/** Storage'dagi ommaviy rasm havolasidan bucket ichidagi yo'lni ajratadi (o'chirish uchun). */
export function storagePath(url: string, bucket: string): string | null {
  const m = url.match(new RegExp(`/object/public/${bucket}/(.+)$`));
  return m ? decodeURIComponent(m[1]) : null;
}
