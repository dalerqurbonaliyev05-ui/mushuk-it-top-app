// Veb-versiya (PWA, iPhone/brauzer) testi: dist-test-web/ (`npm run build:test-web`) saytdagidek /mushuk-it/app/ ostida ochiladi.
// Tekshiriladi: manifest va iOS teglari, service worker (offline ochilish), Google'ga to'g'ri qaytish manzili,
// Google'dan ?code=... bilan qaytish (PKCE), ?error=... xabari va brauzer "orqaga" tugmasi.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist-test-web");
const BASE_PATH = "/mushuk-it/app/";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const CHROME = process.env.CHROMIUM_PATH || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => fs.existsSync(p));
const SB = "https://testproj.supabase.co";
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

let server, origin, browser;
before(async () => {
  assert.ok(fs.existsSync(path.join(ROOT, "index.html")), "avval: npm run build:test-web");
  server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (!u.pathname.startsWith(BASE_PATH)) { res.writeHead(404); return res.end("yo'q"); }
    const rel = decodeURIComponent(u.pathname.slice(BASE_PATH.length)) || "index.html";
    const p = path.join(ROOT, rel);
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end("yo'q"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream", "Cache-Control": "no-cache" });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
});
after(async () => { await browser?.close(); server?.close(); });

const PROFILE = { user_id: "u-me", full_name: "Sinov Foydalanuvchi", google_id: "g", avatar_url: null, phone: null, city: null, bio: null, onboarded: true, blocked: false, created_at: "2026-01-01T00:00:00Z" };
const SESSION = () => ({ access_token: "a.b.c", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "u-me", aud: "authenticated", email: "sinov@x.uz", user_metadata: {}, app_metadata: { provider: "google" } } });

async function iphone({ sw = "block", loggedIn = false } = {}) {
  const ctx = await browser.newContext({ userAgent: IPHONE_UA, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "uz-UZ", serviceWorkers: sw });
  const page = await ctx.newPage();
  const st = { errors: [], authorize: null, token: 0 };
  page.on("pageerror", (e) => st.errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/i.test(m.text())) st.errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem("mi_lang", "uz"); } catch { /* */ } });
  if (loggedIn) await page.addInitScript((s) => localStorage.setItem("sb-testproj-auth-token", JSON.stringify(s)), SESSION());
  await page.route(`${SB}/**`, async (route) => {
    const req = route.request(), u = new URL(req.url());
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (u.pathname === "/auth/v1/authorize") { st.authorize = u; return route.fulfill({ status: 200, contentType: "text/html", body: "<p>google</p>" }); }
    if (u.pathname === "/auth/v1/token") { st.token++; st.tokenBody = req.postData(); return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(SESSION()) }); }
    if (u.pathname === "/auth/v1/user") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(SESSION().user) });
    if (u.pathname.startsWith("/rest/v1/")) {
      const t = u.pathname.split("/").pop();
      const single = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
      const h = { ...cors, "content-range": "*/0" };
      if (t === "profiles") return route.fulfill({ status: 200, headers: h, contentType: "application/json", body: JSON.stringify(single ? PROFILE : [PROFILE]) });
      return route.fulfill({ status: 200, headers: h, contentType: "application/json", body: req.method() === "HEAD" ? "" : "[]" });
    }
    return route.fulfill({ status: 404, headers: cors, body: "" });
  });
  await page.route(/tile\.openstreetmap\.org|nominatim/, (r) => r.abort());
  return { ctx, page, st };
}

test("manifest, ikonkalar va iPhone (Safari) teglari", async () => {
  const { ctx, page, st } = await iphone();
  await page.goto(origin + BASE_PATH);
  await page.getByText("Google bilan kirish").waitFor();
  const head = await page.evaluate(() => ({
    manifest: document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
    apple: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href"),
    capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute("content"),
    title: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute("content"),
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content"),
  }));
  assert.equal(head.manifest, BASE_PATH + "manifest.webmanifest");
  assert.equal(head.apple, BASE_PATH + "icons/apple-touch-icon.png");
  assert.equal(head.capable, "yes");
  assert.ok(head.title);
  assert.match(head.viewport, /viewport-fit=cover/);
  const man = await (await page.request.get(origin + head.manifest)).json();
  assert.equal(man.display, "standalone");
  assert.equal(man.start_url, "./");
  for (const ic of [...man.icons.map((i) => i.src), "icons/apple-touch-icon.png", "favicon.ico", "icon.svg"]) {
    const r = await page.request.get(new URL(ic, origin + BASE_PATH).href);
    assert.equal(r.status(), 200, ic);
  }
  assert.deepEqual(st.errors, []);
  await ctx.close();
});

test("service worker: qobiq keshlanadi, internetsiz ham ochiladi", async () => {
  const { ctx, page, st } = await iphone({ sw: "allow" });
  await page.goto(origin + BASE_PATH);
  await page.getByText("Google bilan kirish").waitFor();
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  assert.equal(new URL(scope).pathname, BASE_PATH);
  await page.waitForFunction(async () => (await caches.keys()).some((k) => k.startsWith("mushuk-it-")));
  const sw = await (await page.request.get(origin + BASE_PATH + "sw.js")).text();
  const pre = JSON.parse(sw.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]);
  assert.ok(pre.includes("./index.html") && pre.some((p) => p.startsWith("./assets/") && p.endsWith(".js")));
  for (const p of pre) assert.equal((await page.request.get(new URL(p, origin + BASE_PATH).href)).status(), 200, p);
  await ctx.setOffline(true);
  await page.reload();
  await page.getByText("Google bilan kirish").waitFor();
  assert.deepEqual(st.errors.filter((e) => !/fetch|network|ERR_INTERNET/i.test(e)), []);
  await ctx.close();
});

test("Google bilan kirish: qaytish manzili /mushuk-it/app/, ?code= bilan qaytgach sessiya ochiladi va manzil tozalanadi", async () => {
  const { ctx, page, st } = await iphone();
  await page.goto(origin + BASE_PATH);
  await page.getByText("Google bilan kirish").click();
  await page.waitForURL(/\/auth\/v1\/authorize/);
  assert.equal(st.authorize.searchParams.get("provider"), "google");
  assert.equal(st.authorize.searchParams.get("redirect_to"), origin + BASE_PATH);
  assert.ok(st.authorize.searchParams.get("code_challenge"), "PKCE");
  // Google -> Supabase -> ilovaga qaytish
  await page.goto(origin + BASE_PATH + "?code=test-code-123");
  await page.locator(".tabbar").waitFor();
  assert.equal(st.token, 1);
  assert.match(st.tokenBody, /test-code-123/);
  assert.equal(new URL(page.url()).search, "");
  assert.deepEqual(st.errors, []);
  await ctx.close();
});

test("Google xato bilan qaytsa (masalan, bekor qilindi): xabar ko'rinadi, manzil tozalanadi", async () => {
  const { ctx, page, st } = await iphone();
  await page.goto(origin + BASE_PATH + "?error=access_denied&error_description=Foydalanuvchi+bekor+qildi");
  await page.locator(".alert.err").filter({ hasText: "Foydalanuvchi bekor qildi" }).waitFor();
  assert.equal(new URL(page.url()).search, "");
  assert.equal(st.token, 0);
  await ctx.close();
});

test("brauzer 'orqaga' tugmasi avval ilova ichidagi sahifani yopadi", async () => {
  const { ctx, page } = await iphone({ loggedIn: true });
  await page.goto(origin + BASE_PATH);
  await page.locator(".tabbar").waitFor();
  const tabs = page.locator(".tabbar button");
  await tabs.nth(1).click();                       // Xarita
  await page.waitForFunction(() => document.querySelectorAll(".tabbar button")[1].classList.contains("on"));
  await page.goBack();
  await page.waitForFunction(() => document.querySelectorAll(".tabbar button")[0].classList.contains("on"));
  assert.equal(new URL(page.url()).pathname, BASE_PATH);
  await ctx.close();
});
