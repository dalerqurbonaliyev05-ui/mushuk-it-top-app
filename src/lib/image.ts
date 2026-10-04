/** Rasmni kichraytirib JPEG qiladi (trafik va Storage tejash; EXIF aylantirish hisobga olinadi). */
export async function compressImage(src: Blob, maxSide = 1280, quality = 0.8): Promise<Blob> {
  const bmp = await createImageBitmap(src, { imageOrientation: 'from-image' });
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('Rasmni qayta ishlab bo\'lmadi');
  g.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const out = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', quality));
  if (!out) throw new Error('Rasmni qayta ishlab bo\'lmadi');
  return out;
}
