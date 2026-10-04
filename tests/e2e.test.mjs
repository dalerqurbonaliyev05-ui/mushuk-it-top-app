// Ilova e2e: dist-test/ (soxta Supabase URL bilan build qilingan) haqiqiy Chromium'da ochiladi, Supabase REST/Storage tarmoq darajasida taqlid qilinadi.
// Kamera brauzerda fayl tanlash oynasi sifatida ishlaydi (filechooser), GPS Playwright geolocation orqali.
// SHOTS=papka node --test e2e.test.mjs  -> ekran rasmlarini saqlaydi.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist-test");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
const CHROME = process.env.CHROMIUM_PATH || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => fs.existsSync(p));
const SB = "https://testproj.supabase.co";
const ME = "u-me";
const SHOTS = process.env.SHOTS;

let server, base, browser, JPEG, DOG_JPEG, TILES;
const DOG_IDS = new Set(["far", "mid"]);
before(async () => {
  server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    const p = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end("yo'q"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const pg = await browser.newPage();
  // Demo rasmlar: pastel fon + katta emoji (jonli rasm o'rniga); plitkalar: oddiy xarita ko'rinishi
  const gen = await pg.evaluate(() => {
    const photo = (emoji, a, b) => {
      const c = document.createElement("canvas"); c.width = 640; c.height = 480; const g = c.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 640, 480); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 640, 480);
      g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.ellipse(320, 470, 330, 90, 0, 0, Math.PI * 2); g.fill();
      g.font = "300px serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(emoji, 320, 235);
      return c.toDataURL("image/jpeg", 0.9).split(",")[1];
    };
    const tile = (k) => {
      const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d");
      g.fillStyle = "#eef2e6"; g.fillRect(0, 0, 256, 256);
      g.fillStyle = "#d4e8c2"; g.fillRect(20 + k * 25, 150, 90, 70); g.fillStyle = "#cfe3f5"; g.fillRect(150, 30 + k * 20, 70, 50);
      g.strokeStyle = "#ffffff"; g.lineWidth = 12; g.beginPath(); g.moveTo(0, 90 + k * 12); g.lineTo(256, 110 - k * 8); g.moveTo(130 + k * 10, 0); g.lineTo(120, 256); g.stroke();
      g.strokeStyle = "#f6d98f"; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 200); g.lineTo(256, 190 + k * 6); g.stroke();
      g.strokeStyle = "#d9dccf"; g.lineWidth = 1; for (let i = 32; i < 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
      return c.toDataURL("image/png").split(",")[1];
    };
    return { cat: photo("🐱", "#ffe3d3", "#ffc9a8"), dog: photo("🐶", "#d9ecff", "#b7d8ff"), tiles: [0, 1, 2, 3].map(tile) };
  });
  JPEG = Buffer.from(gen.cat, "base64"); DOG_JPEG = Buffer.from(gen.dog, "base64"); TILES = gen.tiles.map((t) => Buffer.from(t, "base64"));
  await pg.close();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
});
after(async () => { await browser?.close(); server?.close(); });

const photoUrl = (uid, n) => `${SB}/storage/v1/object/public/animal-photos/${uid}/${n}.jpg`;
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const post = (id, uid, type, title, lat, lng, address, minAgo, likes, comments, caption = null) => ({
  id, user_id: uid, animal_type: type, title, image_url: photoUrl(uid, id), latitude: lat, longitude: lng, address, caption, status: "active",
  created_at: ago(minAgo), likes: [{ count: likes }], comments: [{ count: comments }],
});
function seed({ onboarded = true, blocked = false } = {}) {
  return {
    profiles: [{ user_id: ME, full_name: "Daler Qurbonaliyev", google_id: "g", avatar_url: null, phone: null, city: "Toshkent", bio: "Hayvonlarni yaxshi ko'raman", onboarded, blocked, created_at: "2026-01-01T00:00:00Z" }],
    public_profiles: [{ user_id: ME, full_name: "Daler Qurbonaliyev", avatar_url: null }, { user_id: "u-bek", full_name: "Bek Karimov", avatar_url: null }, { user_id: "u-ali", full_name: "Ali Valiyev", avatar_url: null }],
    posts: [
      post("far", "u-ali", "dog", "Uzoqdagi it", 41.2200, 69.1500, "Yunusobod, Toshkent", 30, 5, 0),
      post("near", "u-bek", "cat", "Chiroyli mushuk", 41.3150, 69.2850, "Mirzo Ulug'bek tumani, Toshkent", 120, 24, 5, "Bardoshli va odamlar bilan do'st."),
      post("mid", "u-bek", "dog", "Sodiq it", 41.2900, 69.2400, "Chilonzor, Toshkent", 240, 17, 2),
      post("mine", ME, "cat", "Mening mushugim", 41.3000, 69.2700, "Shayxontohur, Toshkent", 600, 3, 1),
    ],
    mylikes: [], comments: [{ id: "c1", post_id: "near", user_id: "u-bek", text: "Hozir ham shu yerda", created_at: ago(5) }],
    notifications: [
      { id: "n1", user_id: ME, actor_id: "u-bek", type: "like", post_id: "mine", body: null, read: false, created_at: ago(2) },
      { id: "n2", user_id: ME, actor_id: "u-ali", type: "comment", post_id: "mine", body: "Juda yoqimli!", read: true, created_at: ago(90) },
    ],
    uploads: [], calls: [],
  };
}
const postWithJoin = (db, p) => ({ ...p, posts: p });

async function openApp(db, opts = {}) {
  const { geo = true, w = 400, h = 800, scheme = "light", dpr = 1 } = opts;
  const ctx = await browser.newContext({ colorScheme: scheme, deviceScaleFactor: dpr, locale: "en-US", geolocation: { latitude: 41.3111, longitude: 69.2797, accuracy: 12 }, permissions: geo ? ["geolocation"] : [], viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|nominatim|tile/i.test(m.text())) errors.push(m.text()); });
  await page.route("https://nominatim.openstreetmap.org/**", (r) => r.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ address: { road: "Navoiy ko'chasi", suburb: "Mirzo Ulug'bek", city: "Toshkent" } }) }));
  await page.route("https://tile.openstreetmap.org/**", (r) => { const m = r.request().url().match(/\/(\d+)\/(\d+)\/(\d+)\.png/); const k = m ? (Number(m[2]) + Number(m[3])) % 4 : 0; return r.fulfill({ status: 200, contentType: "image/png", body: TILES[k] }); });
  await page.route(`${SB}/**`, async (route) => {
    const req = route.request(), u = new URL(req.url()), m = req.method();
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };
    const json = (body, status = 200) => route.fulfill({ status, headers: cors, contentType: "application/json", body: JSON.stringify(body) });
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (u.pathname.startsWith("/storage/v1/object/public/")) { const id = u.pathname.split("/").pop().replace(/(_t)?\.jpg$/, ""); return route.fulfill({ status: 200, headers: cors, contentType: "image/jpeg", body: DOG_IDS.has(id) ? DOG_JPEG : JPEG }); }
    const t = u.pathname.split("/").pop();
    const sp = u.searchParams;
    db.calls.push({ m, t, path: u.pathname, search: u.search, body: req.postData() });
    if (u.pathname.startsWith("/storage/v1/object/animal-photos/") && m === "POST") { db.uploads.push(u.pathname.replace("/storage/v1/object/animal-photos/", "")); return json({ Key: "animal-photos/x" }); }
    if (u.pathname.startsWith("/rest/v1/")) {
      const single = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
      const eq = (k) => sp.get(k)?.replace("eq.", "");
      if (m === "HEAD" || (m === "GET" && /count=exact/.test(req.headers()["prefer"] || ""))) {
        let n = 0;
        if (t === "posts") n = db.posts.filter((p) => p.user_id === eq("user_id")).length;
        if (t === "comments") n = db.comments.filter((c) => c.user_id === eq("user_id")).length;
        if (t === "likes") n = db.posts.filter((p) => p.user_id === eq("posts.user_id")).reduce((s, p) => s + p.likes[0].count, 0);
        if (t === "notifications") n = db.notifications.filter((x) => !x.read).length;
        return route.fulfill({ status: 200, headers: { ...cors, "content-range": `*/${n}` }, contentType: "application/json", body: m === "HEAD" ? "" : "[]" });
      }
      if (m === "GET") {
        let rows;
        if (t === "likes") {
          rows = (sp.get("select") || "").includes("posts(") ? db.mylikes.map((l) => ({ created_at: ago(1), posts: db.posts.find((p) => p.id === l.post_id) })) : db.mylikes;
        } else if (t === "notifications") {
          rows = db.notifications.filter((x) => !eq("type") || x.type === eq("type")).map((x) => ({ ...x, posts: db.posts.find((p) => p.id === x.post_id) }));
        } else if (t === "comments") {
          rows = db.comments.filter((c) => !eq("post_id") || c.post_id === eq("post_id")).filter((c) => !eq("user_id") || c.user_id === eq("user_id")).map((c) => ({ ...c, posts: db.posts.find((p) => p.id === c.post_id) }));
        } else {
          rows = db[t] || [];
          if (t === "posts") {
            if (eq("user_id")) rows = rows.filter((p) => p.user_id === eq("user_id"));
            if (eq("id")) rows = rows.filter((p) => p.id === eq("id"));
            if (eq("animal_type")) rows = rows.filter((p) => p.animal_type === eq("animal_type"));
            const lo = sp.get("latitude") ? null : null; void lo;
            const gte = (k) => Number(new URLSearchParams(u.search.replaceAll("&", "&")).getAll(k).find((v) => v.startsWith("gte."))?.slice(4));
            const lte = (k) => Number(new URLSearchParams(u.search).getAll(k).find((v) => v.startsWith("lte."))?.slice(4));
            if (sp.getAll("latitude").length) rows = rows.filter((p) => p.latitude >= gte("latitude") && p.latitude <= lte("latitude") && p.longitude >= gte("longitude") && p.longitude <= lte("longitude"));
            const orq = sp.get("or"); const mm = orq?.match(/title\.ilike\.\*(.*?)\*,/);
            if (mm) rows = rows.filter((p) => (p.title || "").toLowerCase().includes(mm[1].toLowerCase()));
            const lim = Number(sp.get("limit") || 0); void lim;
          }
          if (t === "public_profiles" && sp.get("user_id")?.startsWith("in.")) { const ids = sp.get("user_id").slice(4).replace(/[()"]/g, "").split(","); rows = rows.filter((p) => ids.includes(p.user_id)); }
        }
        const off = Number(sp.get("offset") || 0);
        if (off) rows = [];
        if (single) return rows[0] ? json(rows[0]) : route.fulfill({ status: 406, headers: cors, contentType: "application/json", body: JSON.stringify({ code: "PGRST116", message: "0 rows" }) });
        return json(rows);
      }
      if (m === "PATCH") {
        if (t === "profiles") Object.assign(db.profiles[0], JSON.parse(req.postData()));
        if (t === "notifications") db.notifications.forEach((n) => { n.read = true; });
        return route.fulfill({ status: 204, headers: cors });
      }
      if (m === "POST") {
        const b = JSON.parse(req.postData());
        if (t === "likes") { db.mylikes.push({ post_id: b.post_id }); db.posts.find((p) => p.id === b.post_id).likes[0].count++; }
        if (t === "comments") { db.comments.push({ id: "c" + (db.comments.length + 1), ...b, created_at: new Date().toISOString() }); }
        if (t === "posts") { db.posts.unshift({ id: "pn", status: "active", created_at: new Date().toISOString(), likes: [{ count: 0 }], comments: [{ count: 0 }], ...b }); db.newPost = b; }
        return route.fulfill({ status: 201, headers: cors });
      }
      if (m === "DELETE") { if (t === "likes") { db.mylikes = []; db.posts.find((p) => p.id === "near").likes[0].count--; } return route.fulfill({ status: 204, headers: cors }); }
    }
    return json({ message: "mock yo'q: " + m + " " + u.pathname }, 404);
  });
  await page.addInitScript((lang) => { try { if (!localStorage.getItem("mi_lang")) localStorage.setItem("mi_lang", lang); } catch { /* */ } }, opts.lang || "uz");
  await page.addInitScript((me) => {
    localStorage.setItem("sb-testproj-auth-token", JSON.stringify({ access_token: "a.b.c", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: me, email: "daler_uz@x.uz", user_metadata: {} } }));
  }, ME);
  await page.goto(base);
  return { page, errors, ctx };
}
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + ".png") }); };
const tab = (page, name) => page.locator(".tabbar button", { hasText: name });

test("kirmagan foydalanuvchi: logo, shior va Google tugmasi", async () => {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, locale: "en-US" }); const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.setItem("mi_lang", "uz"); } catch { /* */ } });
  await page.goto(base);
  await page.getByText("Google bilan kirish").waitFor();
  assert.match(await page.locator("h1").innerText(), /Mushuk va Itlarni Top/);
  assert.ok(await page.locator("img.login-logo").evaluate((i) => i.complete && i.naturalWidth > 0), "logo yuklanishi kerak");
  assert.equal(await page.getByText("Instagram").count(), 0);
  await shot(page, "1-login");
  await ctx.close();
});

test("birinchi kirish: profil to'ldirish (ism-sharif majburiy), so'ng bosh sahifa", async () => {
  const db = seed({ onboarded: false });
  const { page, errors, ctx } = await openApp(db);
  await page.getByText("Profilingizni to'ldiring").waitFor();
  await page.locator("input").first().fill("Ali");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await page.getByText(/to'liq kiriting/).waitFor();
  await page.locator("input").first().fill("Ali Valiyev");
  await page.locator("input").nth(1).fill("+998901234567");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await page.locator(".row-card").first().waitFor();
  assert.equal(db.profiles[0].onboarded, true);
  assert.equal(db.profiles[0].full_name, "Ali Valiyev");
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("bosh sahifa: yaqin atrofdagi e'lonlar masofa bo'yicha, plitkalar, kamera kartasi", async () => {
  const db = seed();
  const { page, errors, ctx } = await openApp(db);
  await page.locator(".row-card").first().waitFor();
  await page.waitForFunction(() => /\d+ m|\d(\.\d)? km/.test(document.querySelector(".row-card")?.textContent || ""));
  const titles = await page.locator(".row-title").allInnerTexts();
  assert.deepEqual(titles, ["Chiroyli mushuk", "Mening mushugim", "Sodiq it", "Uzoqdagi it"], "masofa bo'yicha tartib (eng yaqini birinchi)");
  const first = await page.locator(".row-card").first().innerText();
  assert.match(first, /Chiroyli mushuk/); assert.match(first, /Mirzo Ulug'bek|Toshkent/); assert.match(first, /24/);
  assert.match(first, /\d+ m|\d(\.\d)? km/);
  assert.ok(await page.locator(".row-img").first().evaluate((i) => i.complete && i.naturalWidth > 0), "kichik rasm (yoki to'liq rasmga qaytish) yuklanishi kerak");
  await shot(page, "2-home");
  // plitka: faqat itlar
  await page.locator(".tile.dog").click();
  await page.getByRole("heading", { name: "Itlar" }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".post").length >= 1);
  assert.equal(await page.locator(".post .badge.cat").count(), 0);
  await page.locator(".hdr .icon-btn").click();
  // kamera kartasi -> yangi e'lon
  await page.locator(".cam-card").click();
  await page.getByText("Yangi e'lon").waitFor();
  assert.ok(await page.locator(".tile.cat").isVisible() && await page.locator(".tile.dog").isVisible());
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("qidiruv: bosh sahifadan sarlavha bo'yicha", async () => {
  const db = seed();
  const { page, ctx } = await openApp(db);
  await page.locator(".row-card").first().waitFor();
  await page.fill(".search input", "sodiq");
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Barcha e'lonlar" }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".post").length === 1);
  assert.match(await page.locator(".post").innerText(), /Sodiq it/);
  await ctx.close();
});

test("e'lon tafsilotlari: sarlavha, joylashuv, masofa, mini xarita, layk va izoh", async () => {
  const db = seed();
  const { page, errors, ctx } = await openApp(db);
  await page.locator(".row-card", { hasText: "Chiroyli mushuk" }).click();
  await page.getByRole("heading", { name: "Chiroyli mushuk" }).waitFor();
  const t = await page.locator(".screen").innerText();
  assert.match(t, /Mirzo Ulug'bek tumani, Toshkent/); assert.match(t, /Bek Karimov/); assert.match(t, /Bardoshli va odamlar/);
  assert.match(t, /Masofa/); assert.match(t, /\d+ m|\d(\.\d)? km/); assert.match(t, /Hozir ham shu yerda/);
  await page.locator(".mini-map .leaflet-container, .mini-map.leaflet-container").first().waitFor();
  await shot(page, "3-detail");
  // layk
  await page.getByRole("button", { name: /Layk \(24\)/ }).click();
  await page.getByRole("button", { name: /Layk \(25\)/ }).waitFor();
  assert.deepEqual(db.mylikes, [{ post_id: "near" }]);
  await page.getByRole("button", { name: /Layk \(25\)/ }).click();
  await page.getByRole("button", { name: /Layk \(24\)/ }).waitFor();
  // izoh
  await page.fill(".comment-bar input", "Men ham ko'rdim");
  await page.locator(".send").click();
  await page.getByText("Men ham ko'rdim").waitFor();
  assert.equal(db.comments.at(-1).user_id, ME);
  await page.getByRole("link", { name: /Izoh \(6\)/ }).waitFor();
  // Google Maps
  await ctx.route("https://www.google.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>maps</title>" }));
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: /Google Maps'da ochish/ }).click()]);
  assert.match(popup.url(), /google\.com\/maps\/search\/\?api=1&query=41\.315(%2C|,)69\.285/);
  // orqaga
  await page.locator(".hdr .icon-btn").first().click();
  await page.locator(".row-card").first().waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("xarita: rasmli pinlar, tur filtri, tanlangan e'lon kartasi va tafsilotlarga o'tish", async () => {
  const db = seed();
  const { page, errors, ctx } = await openApp(db);
  await page.locator(".row-card").first().waitFor();
  await tab(page, "Xarita").click();
  await page.locator(".leaflet-container").waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".photo-pin").length === 4);
  assert.ok(await page.locator(".map-card").isVisible());
  await shot(page, "4-map");
  await page.locator(".chip-btn.dog").click();
  await page.waitForFunction(() => document.querySelectorAll(".photo-pin").length === 2);
  assert.equal(await page.locator(".photo-pin.cat").count(), 0);
  // eng yaqin it tanlangan va kartada ko'rinadi
  assert.match(await page.locator(".map-card").innerText(), /Sodiq it/);
  // mushuklar: ko'rinib turgan pinni bosish kartani almashtiradi
  await page.locator(".chip-btn.cat").click();
  await page.waitForFunction(() => document.querySelectorAll(".photo-pin").length === 2);
  assert.match(await page.locator(".map-card").innerText(), /Chiroyli mushuk/);
  await page.locator(".photo-pin:not(.sel)").click();
  await page.waitForFunction(() => /Mening mushugim/.test(document.querySelector(".map-card").textContent));
  await page.getByRole("button", { name: /Lokatsiyani ko'rish/ }).click();
  await page.locator(".detail-img").waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("yangi e'lon: kategoriya -> kamera -> GPS avtomatik -> sarlavha -> yuborish (rasm + kichik rasm + post)", async () => {
  const db = seed();
  const { page, errors, ctx } = await openApp(db);
  await page.locator(".row-card").first().waitFor();
  await page.locator(".tabbar .add").click();
  page.once("filechooser", (fc) => fc.setFiles({ name: "cat.jpg", mimeType: "image/jpeg", buffer: JPEG }));
  await page.locator(".tile.cat").click();
  await page.getByText("E'lonni tasdiqlang").waitFor();
  const loc = await page.locator(".loc.solo").innerText();
  assert.match(loc, /Navoiy ko'chasi/); assert.match(loc, /41\.31110, 69\.27970/);
  await page.fill("input[placeholder^='Masalan: Chiroyli']", "Oq mushuk");
  await page.fill("textarea", "Qo'rqmaydi");
  await page.getByRole("button", { name: "E'lon qilish" }).click();
  await page.locator(".row-card").first().waitFor();
  assert.equal(db.uploads.length, 2);
  assert.ok(db.uploads.some((u) => new RegExp(`^${ME}/[0-9a-f-]{36}\\.jpg$`).test(u)), "asl rasm egasining papkasiga");
  assert.ok(db.uploads.some((u) => new RegExp(`^${ME}/[0-9a-f-]{36}_t\\.jpg$`).test(u)), "kichik rasm");
  const b = db.newPost;
  assert.equal(b.user_id, ME); assert.equal(b.animal_type, "cat"); assert.equal(b.title, "Oq mushuk");
  assert.equal(b.latitude, 41.3111); assert.equal(b.longitude, 69.2797);
  assert.equal(b.address, "Navoiy ko'chasi, Mirzo Ulug'bek, Toshkent"); assert.equal(b.caption, "Qo'rqmaydi");
  assert.ok(b.image_url.startsWith(`${SB}/storage/v1/object/public/animal-photos/${ME}/`));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("joylashuv ruxsati yo'q: bosh sahifada ogohlantirish, e'lon yuborib bo'lmaydi", async () => {
  const db = seed();
  const { page, ctx } = await openApp(db, { geo: false });
  await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = (_ok, err) => err({ code: 1, message: "User denied Geolocation" }); });
  await page.reload();
  await page.getByText(/Joylashuv aniqlanmadi/).waitFor();
  await page.locator(".row-card").first().waitFor();
  await page.locator(".tabbar .add").click();
  page.once("filechooser", (fc) => fc.setFiles({ name: "dog.jpg", mimeType: "image/jpeg", buffer: JPEG }));
  await page.locator(".tile.dog").click();
  await page.getByText(/Joylashuv olinmadi/).waitFor();
  assert.ok(await page.getByRole("button", { name: "E'lon qilish" }).isDisabled());
  await ctx.close();
});

test("bildirishnomalar: layk va izohlar, o'qilmaganlar belgisi, o'qilgan deb belgilanadi", async () => {
  const db = seed();
  const { page, errors, ctx } = await openApp(db);
  await page.locator(".row-card").first().waitFor();
  await page.locator(".tabbar .dot").waitFor();
  assert.equal(await page.locator(".tabbar .dot").innerText(), "1");
  await tab(page, "Xabarlar").click();
  await page.locator(".notif").first().waitFor();
  assert.equal(await page.locator(".notif").count(), 2);
  const t = await page.locator(".notif").allInnerTexts();
  assert.match(t[0], /Bek Karimov.*layk bosdi/s); assert.match(t[1], /Ali Valiyev.*izoh qoldirdi/s); assert.match(t[1], /Juda yoqimli!/);
  await shot(page, "5-notifs");
  await page.waitForFunction(() => !document.querySelector(".tabbar .dot"));
  assert.ok(db.notifications.every((n) => n.read));
  await page.locator(".chip-btn.comment").click();
  await page.waitForFunction(() => document.querySelectorAll(".notif").length === 1);
  await page.locator(".notif").click();
  await page.getByRole("heading", { name: "Mening mushugim" }).waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("profil: statistika, @nom va menyu (mening e'lonlarim, sevimlilar, izohlarim, yordam)", async () => {
  const db = seed();
  db.mylikes.push({ post_id: "near" });
  db.comments.push({ id: "c9", post_id: "near", user_id: ME, text: "Mening izohim", created_at: ago(1) });
  const { page, errors, ctx } = await openApp(db);
  await page.locator(".row-card").first().waitFor();
  await tab(page, "Profil").click();
  await page.getByRole("heading", { name: "Daler Qurbonaliyev" }).waitFor();
  assert.match(await page.locator(".me-head").innerText(), /@daler_uz/);
  await page.waitForFunction(() => /1\s*E'lonlar/i.test(document.querySelector(".stats").textContent.replace(/\n/g, "")) || document.querySelector(".stats b").textContent === "1");
  const stats = await page.locator(".stats b").allInnerTexts();
  assert.deepEqual(stats, ["1", "3", "1"]);   // 1 e'lon, 3 layk (mening e'lonimga), 1 izoh
  await shot(page, "6-profile");
  await page.locator(".menu-item", { hasText: "Mening e'lonlarim" }).click();
  await page.locator(".row-card").first().waitFor();
  assert.equal(await page.locator(".row-card").count(), 1);
  await page.locator(".hdr .icon-btn").click();
  await page.locator(".menu-item", { hasText: "Sevimlilarim" }).click();
  await page.locator(".row-card", { hasText: "Chiroyli mushuk" }).waitFor();
  await page.locator(".hdr .icon-btn").click();
  await page.locator(".menu-item", { hasText: "Izohlarim" }).click();
  await page.getByText("Mening izohim").waitFor();
  await page.locator(".hdr .icon-btn").click();
  await page.locator(".menu-item", { hasText: "Yordam" }).click();
  await page.getByText("Qanday e'lon qo'yiladi?").waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("bloklangan foydalanuvchi: bloklangan ekran", async () => {
  const db = seed({ blocked: true });
  const { page, ctx } = await openApp(db);
  await page.getByText("Hisobingiz bloklangan").waitFor();
  assert.equal(await page.locator(".tabbar").count(), 0);
  await ctx.close();
});

test("kirish ekranida til almashtirish (uz / ru / en) saqlanadi", async () => {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, locale: "en-US" }); const page = await ctx.newPage();
  await page.goto(base);
  // brauzer tili ingliz bo'lsa va saqlangan til bo'lmasa: inglizcha
  await page.getByText("Sign in with Google").waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.lang), "en");
  await page.getByRole("button", { name: "Русский" }).click();
  await page.getByText("Войти через Google").waitFor();
  assert.match(await page.locator("h1").innerText(), /Найди кошек и собак/);
  assert.equal(await page.evaluate(() => document.documentElement.lang), "ru");
  await page.getByRole("button", { name: "O'zbekcha" }).click();
  await page.getByText("Google bilan kirish").waitFor();
  await page.reload();
  await page.getByText("Google bilan kirish").waitFor();   // tanlov saqlanadi
  await shot(page, "7-login-uz");
  await ctx.close();
});

test("til: Sozlamalar orqali ingliz va rus tiliga o'tish (tablar, sarlavhalar, vaqt va masofa birliklari)", async () => {
  const db = seed();
  const { page, errors, ctx } = await openApp(db);
  await page.locator(".row-card").first().waitFor();
  await tab(page, "Profil").click();
  await page.locator(".menu-item", { hasText: "Sozlamalar" }).click();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("heading", { name: "Settings" }).waitFor();
  await page.locator(".hdr .icon-btn").click();
  assert.equal(await page.locator(".menu-item .grow").first().innerText(), "My posts");
  await tab(page, "Home").click();
  await page.getByRole("heading", { name: "Posts near you" }).waitFor();
  assert.deepEqual(await page.locator(".tabbar button span:not(.ico-wrap)").allInnerTexts(), ["Home", "Map", "Alerts", "Profile"]);
  const first = await page.locator(".row-card").first().innerText();
  assert.match(first, /Cat/); assert.match(first, /h ago|min ago/); assert.match(first, /\d+ m|\d(\.\d)? km/);
  await shot(page, "8-home-en");
  // rus tili
  await tab(page, "Profile").click();
  await page.locator(".menu-item", { hasText: "Settings" }).click();
  await page.getByRole("button", { name: "Русский" }).click();
  await page.getByRole("heading", { name: "Настройки" }).waitFor();
  await page.locator(".hdr .icon-btn").click();
  await tab(page, "Главная").click();
  await page.getByRole("heading", { name: "Объявления рядом" }).waitFor();
  const ru = await page.locator(".row-card").first().innerText();
  assert.match(ru, /Кошка/); assert.match(ru, /ч\. назад|мин\. назад/); assert.match(ru, /\d+ м|\d(\.\d)? км/);
  await shot(page, "9-home-ru");
  // xarita va bildirishnoma matnlari ham tarjima qilinadi
  await tab(page, "Уведомл.").click();
  await page.locator(".notif").first().waitFor();
  assert.match(await page.locator(".notif").first().innerText(), /Bek Karimov поставил\(а\) лайк/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("qorong'u rejim: tizim sozlamasiga ergashadi, qo'lda yorug'/qorong'u tanlanadi va saqlanadi", async () => {
  const db = seed();
  // 1) tizim qorong'u -> "Tizim" rejimida qorong'u
  const a = await openApp(db, { scheme: "dark" });
  await a.page.locator(".row-card").first().waitFor();
  assert.equal(await a.page.evaluate(() => document.documentElement.dataset.theme), "dark");
  const bgDark = await a.page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const cardDark = await a.page.locator(".row-card").first().evaluate((e) => getComputedStyle(e).backgroundColor);
  assert.notEqual(bgDark, "rgb(246, 248, 247)"); assert.notEqual(cardDark, "rgb(255, 255, 255)");
  await shot(a.page, "10-home-dark");
  // 2) qo'lda yorug'
  await tab(a.page, "Profil").click();
  await a.page.locator(".menu-item", { hasText: "Sozlamalar" }).click();
  await a.page.getByRole("button", { name: "Yorug'" }).click();
  await a.page.waitForFunction(() => document.documentElement.dataset.theme === "light");
  assert.equal(await a.page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(246, 248, 247)");
  // 3) qayta yuklagach tanlov saqlanadi (tizim qorong'u bo'lsa ham yorug')
  await a.page.reload();
  await a.page.locator(".row-card, .menu-item, .tabbar").first().waitFor();
  assert.equal(await a.page.evaluate(() => document.documentElement.dataset.theme), "light");
  await a.ctx.close();
  // 4) qo'lda qorong'u (tizim yorug')
  const b = await openApp(db, { scheme: "light" });
  await b.page.locator(".row-card").first().waitFor();
  assert.equal(await b.page.evaluate(() => document.documentElement.dataset.theme), "light");
  await tab(b.page, "Profil").click();
  await b.page.locator(".menu-item", { hasText: "Sozlamalar" }).click();
  await b.page.getByRole("button", { name: "Qorong'u" }).click();
  await b.page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  assert.equal(await b.page.evaluate(() => document.querySelector('meta[name="theme-color"]').content), "#0d1412");
  await b.page.locator(".hdr .icon-btn").click();
  await tab(b.page, "Xarita").click();
  await b.page.locator(".leaflet-container").waitFor();
  assert.match(await b.page.locator(".leaflet-tile-pane").evaluate((e) => getComputedStyle(e).filter), /invert/);
  await shot(b.page, "11-map-dark");
  assert.deepEqual(b.errors, []);
  await b.ctx.close();
});

// Qo'llanma uchun ekran rasmlari (faqat GUIDE_SHOTS=papka bilan): uchala tilda, 2x aniqlikda.
test("qo'llanma ekran rasmlari", { skip: !process.env.GUIDE_SHOTS }, async () => {
  const out = process.env.GUIDE_SHOTS; fs.mkdirSync(out, { recursive: true });
  for (const lang of ["uz", "ru", "en"]) {
    const snap = (page, name) => page.screenshot({ path: path.join(out, `${lang}-${name}.png`) });
    // kirish ekrani
    { const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, locale: "en-US" }); const page = await ctx.newPage();
      await page.addInitScript((l) => { try { localStorage.setItem("mi_lang", l); } catch { /* */ } }, lang);
      await page.goto(base); await page.locator(".btn.google").waitFor(); await snap(page, "login"); await ctx.close(); }
    const db = seed();
    db.profiles[0].full_name = "Aziz Karimov"; db.public_profiles[0].full_name = "Aziz Karimov"; db.profiles[0].bio = null;
    const { page, ctx } = await openApp(db, { lang, w: 390, h: 800, dpr: 2 });
    await page.locator(".row-card").first().waitFor();
    await page.waitForFunction(() => /\d+ (m|м)|\d(\.\d)? (km|км)/.test(document.querySelector(".row-card")?.textContent || ""));
    await page.waitForTimeout(400); await snap(page, "home");
    await tab(page, "").nth(1).click();
    await page.waitForFunction(() => document.querySelectorAll(".photo-pin").length === 4);
    await page.waitForTimeout(900); await snap(page, "map");
    await tab(page, "").nth(0).click();
    await page.locator(".row-card").first().click();
    await page.locator(".detail-img").waitFor(); await page.waitForTimeout(500); await snap(page, "detail");
    await page.locator(".hdr .icon-btn").first().click();
    await page.locator(".tabbar .add").click();
    await page.waitForTimeout(300); await snap(page, "new");
    page.once("filechooser", (fc) => fc.setFiles({ name: "cat.jpg", mimeType: "image/jpeg", buffer: JPEG }));
    await page.locator(".tile.cat").click();
    await page.locator(".loc.solo").waitFor(); await page.fill("input[maxlength='80']", lang === "ru" ? "Белая кошка" : lang === "en" ? "White cat" : "Oq mushuk"); await page.waitForTimeout(300); await snap(page, "confirm");
    await tab(page, "").nth(3).click();
    await page.locator(".notif").first().waitFor(); await page.waitForTimeout(300); await snap(page, "notifs");
    await tab(page, "").nth(4).click();
    await page.locator(".stats").waitFor(); await page.waitForTimeout(500); await snap(page, "profile");
    await ctx.close();
  }
  { const db = seed(); const { page, ctx } = await openApp(db, { lang: "uz", w: 390, h: 800, dpr: 2, scheme: "dark" });
    await page.locator(".row-card").first().waitFor(); await page.waitForFunction(() => /\d+ m|\d(\.\d)? km/.test(document.querySelector(".row-card")?.textContent || "")); await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, "uz-home-dark.png") }); await ctx.close(); }
});
