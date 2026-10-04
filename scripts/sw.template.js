/*
 * Mushuk va Itlarni Top — service worker (veb-versiya / PWA).
 *
 * Bu SHABLON: `npm run build:web` paytida vite.config.ts (pwaServiceWorker plagini) undan dist-web/sw.js ni
 * yaratadi: VERSION ga barcha fayllarning kontent xeshi, PRECACHE ga yig'ilgan fayllar ro'yxati yoziladi.
 *
 * Strategiya:
 *  - install: ilova qobig'i (HTML, JS, CSS, ikonkalar) oldindan keshlanadi → tez ochiladi.
 *  - Supabase, xarita plitkalari, Google va boshqa tashqi so'rovlarga TEGILMAYDI (har doim tarmoq):
 *    e'lonlar va rasmlar doim yangi bo'ladi.
 *  - skipWaiting YO'Q: yangi versiya fonda yuklanadi va ilova keyingi safar ochilganda faollashadi.
 *  - Google'dan qaytishda (?code=...) sahifa ham keshdagi qobiqdan ochiladi; kodni supabase-js o'zi almashtiradi.
 *  - APK (Capacitor) ichida bu fayl ro'yxatdan o'tkazilmaydi (src/main.tsx).
 */
const VERSION = "__VERSION__";
const CACHE = "mushuk-it-" + VERSION;
const PRECACHE = __PRECACHE__;

const inScope = (path) => new URL(path, self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((p) => new Request(inScope(p), { cache: "reload" }))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("mushuk-it-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;

  // Sahifa ochilishi: avval tarmoq (yangi versiya darhol), internet bo'lmasa keshdagi qobiq.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match(inScope("./index.html"))) || (await cache.match(inScope("./"))) || Response.error();
        }
      })(),
    );
    return;
  }

  // Statik fayllar: avval kesh, bo'lmasa tarmoq.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(req, { ignoreSearch: true })) || fetch(req);
    })(),
  );
});
