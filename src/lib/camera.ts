import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { tr } from '../i18n';

/** Kamera bilan rasm oladi. Foydalanuvchi bekor qilsa null. Brauzerda (dev) fayl tanlash oynasi ochiladi. */
export async function takePhoto(): Promise<Blob | null> {
  if (!Capacitor.isNativePlatform()) return pickFile();
  try {
    const p = await Camera.getPhoto({ quality: 90, resultType: CameraResultType.Uri, source: CameraSource.Camera, correctOrientation: true, saveToGallery: false });
    if (!p.webPath) return null;
    return await (await fetch(p.webPath)).blob();
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(m)) return null;
    if (/denied|permission/i.test(m)) throw new Error(tr('err.camDenied'));
    throw new Error(tr('err.camFail', { err: m }));
  }
}

/**
 * Brauzer va iPhone (Safari): <input type="file" capture> kamerani ochadi (kutubxonadan tanlash ham mumkin).
 * Safari'ning eski versiyalarida "cancel" hodisasi yo'q, shuning uchun oyna yopilib sahifaga fokus qaytgach
 * fayl tanlanmagan bo'lsa ham null qaytaramiz (aks holda tugma "kutish" holatida qolib ketardi).
 */
function pickFile(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = 'image/*'; i.setAttribute('capture', 'environment');
    i.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(i);
    let done = false;
    const finish = (b: Blob | null) => {
      if (done) return;
      done = true;
      window.removeEventListener('focus', onFocus);
      i.remove();
      resolve(b);
    };
    // Fokus qaytgandan so'ng "change" kechikib kelishi mumkin (katta rasm): 4 s kutamiz. Yangi brauzerlarda "cancel" darhol keladi.
    const onFocus = () => setTimeout(() => { if (!i.files?.length) finish(null); }, 4000);
    i.onchange = () => finish(i.files?.[0] ?? null);
    i.addEventListener('cancel', () => finish(null));
    setTimeout(() => window.addEventListener('focus', onFocus), 300);
    i.click();
  });
}
