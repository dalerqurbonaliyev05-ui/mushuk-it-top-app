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

function pickFile(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = 'image/*'; i.setAttribute('capture', 'environment');
    i.onchange = () => resolve(i.files?.[0] ?? null);
    i.oncancel = () => resolve(null);
    i.click();
  });
}
