import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * Ikki xil build:
 *  - `npm run build` (APK uchun): base './', Capacitor WebView fayllarni nisbiy yo'ldan yuklaydi; PWA qismlari YO'Q.
 *  - `npm run build:web` (iPhone/brauzer uchun veb-ilova, PWA): --mode web, base = VITE_BASE (standart /mushuk-it/app/),
 *    natija dist-web/ da: manifest, iOS ikonkalari va service worker bilan. Saytga energyvibe.uz/mushuk-it/app/ ga qo'yiladi.
 */
const WEB_BASE = (process.env.VITE_BASE || '/mushuk-it/app/').replace(/\/?$/, '/');

/** Veb-build: <head> ga manifest, iOS (Safari) teglari va ikonkalarni qo'shadi. */
function pwaHead(base: string): Plugin {
  return {
    name: 'mushuk-pwa-head',
    transformIndexHtml(html) {
      const tags = [
        `<link rel="manifest" href="${base}manifest.webmanifest" />`,
        `<link rel="icon" href="${base}favicon.ico" sizes="48x48" />`,
        `<link rel="icon" type="image/svg+xml" href="${base}icon.svg" />`,
        `<link rel="apple-touch-icon" href="${base}icons/apple-touch-icon.png" />`,
        '<meta name="apple-mobile-web-app-capable" content="yes" />',
        '<meta name="mobile-web-app-capable" content="yes" />',
        '<meta name="apple-mobile-web-app-title" content="Mushuk va It" />',
        '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
        '<meta name="format-detection" content="telephone=no" />',
        '<meta name="description" content="Ko\'rdingmi — belgila. Qidiryapsanmi — top! Mushuk va itlarni suratga olib, joylashuvi bilan e\'lon qiling." />',
      ].join('\n    ');
      return html.replace('</head>', `    ${tags}\n  </head>`);
    },
  };
}

/** Veb-build tugagach: dist-web dagi barcha fayllar ro'yxati va xeshi bilan sw.js ni shablondan yaratadi. */
function pwaServiceWorker(): Plugin {
  let outDir = 'dist-web';
  return {
    name: 'mushuk-pwa-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files: string[] = [];
      const walk = (d: string) => readdirSync(d).forEach((f) => {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p); else files.push(p);
      });
      walk(outDir);
      const rel = files.map((f) => relative(outDir, f).split(sep).join('/')).filter((f) => f !== 'sw.js').sort();
      const h = createHash('sha256');
      rel.forEach((f) => { h.update(f); h.update(readFileSync(join(outDir, f))); });
      const tpl = readFileSync('scripts/sw.template.js', 'utf8');
      const sw = tpl
        .replace('"__VERSION__"', JSON.stringify(h.digest('hex').slice(0, 12)))
        .replace('__PRECACHE__', JSON.stringify(rel.map((f) => './' + f), null, 2));
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

export default defineConfig(({ mode }) => {
  const web = mode === 'web';
  return {
    plugins: web ? [react(), pwaHead(WEB_BASE), pwaServiceWorker()] : [react()],
    base: web ? WEB_BASE : './',
    publicDir: web ? 'pwa' : 'public',
    server: { port: 5181 },
    build: { target: 'es2020', chunkSizeWarningLimit: 900, outDir: web ? 'dist-web' : 'dist' },
  };
});
