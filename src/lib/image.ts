/** Rasmni kichraytirib JPEG qiladi (trafik va Storage tejash; EXIF aylantirish hisobga olinadi). */
export async function compressImage(src: Blob, maxSide = 1280, quality = 0.8): Promise<Blob> {
  const img = await decode(src);
  const k = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('Rasmni qayta ishlab bo\'lmadi');
  g.drawImage(img.source, 0, 0, w, h);
  img.close();
  const out = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', quality));
  if (!out) throw new Error('Rasmni qayta ishlab bo\'lmadi');
  return out;
}

interface Decoded { source: CanvasImageSource; width: number; height: number; close: () => void }

/**
 * Rasmni o'qiydi. Avval createImageBitmap (EXIF aylantirish bilan); u yo'q yoki parametrni qo'llamaydigan brauzerlarda
 * (eski iPhone Safari) <img> orqali: Safari <img> da EXIF aylantirishni o'zi qo'llaydi.
 */
async function decode(src: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const b = await createImageBitmap(src, { imageOrientation: 'from-image' });
      return { source: b, width: b.width, height: b.height, close: () => b.close() };
    } catch { /* quyidagi usul */ }
  }
  const url = URL.createObjectURL(src);
  try {
    const el = new Image();
    el.decoding = 'async';
    el.src = url;
    await el.decode();
    return { source: el, width: el.naturalWidth, height: el.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}
