/** Storage'dagi ommaviy rasm havolasidan bucket ichidagi yo'lni ajratadi (o'chirish uchun). */
export function storagePath(url: string, bucket: string): string | null {
  const m = url.match(new RegExp(`/object/public/${bucket}/(.+)$`));
  return m ? decodeURIComponent(m[1]) : null;
}
