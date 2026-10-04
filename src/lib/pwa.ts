import { Capacitor } from '@capacitor/core';

/** Faqat veb-versiyada (`npm run build:web`, iPhone/brauzer): service worker'ni ro'yxatdan o'tkazadi. APK ichida hech narsa qilmaydi. */
export function registerServiceWorker(): void {
  if (import.meta.env.MODE !== 'web' || Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL }).catch(() => undefined);
  });
}

