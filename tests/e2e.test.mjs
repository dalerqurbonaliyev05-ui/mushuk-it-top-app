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

let server, base, browser, JPEG;
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
  const b64 = await pg.evaluate(() => { const c = document.createElement("canvas"); c.width = 400; c.height = 300; const g = c.getContext("2d"); g.fillStyle = "#c84"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#fff"; g.fillRect(50, 50, 120, 90); return c.toDataURL("image/jpeg", 0.9).split(",")[1]; });
  JPEG = Buffer.from(b64, "base64"); await pg.close();
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

async function openApp(db, { geo = true, w = 400, h = 800 } = {}) {
  const ctx = await browser.newContext({ geolocation: { latitude: 41.3111, longitude: 69.2797, accuracy: 12 }, permissions: geo ? ["geolocation"] : [], viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|nominatim|tile/i.test(m.text())) errors.push(m.text()); });
  await page.route("https://nominatim.openstreetmap.org/**", (r) => r.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ address: { road: "Navoiy ko'chasi", suburb: "Mirzo Ulug'bek", city: "Toshkent" } }) }));
  await page.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") }));
  await page.route(`${SB}/**`, async (route) => {
    const req = route.request(), u = new URL(req.url()), m = req.method();
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };
    const json = (body, status = 200) => route.fulfill({ status, headers: cors, contentType: "application/json", body: JSON.stringify(body) });
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (u.pathname.startsWith("/storage/v1/object/public/")) return route.fulfill({ status: 200, headers: cors, contentType: "image/jpeg", body: JPEG });
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
  await page.addInitScript((me) => {
    localStorage.setItem("sb-testproj-auth-token", JSON.stringify({ access_token: "a.b.c", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: me, email: "daler_uz@x.uz", user_metadata: {} } }));
  }, ME);
  await page.goto(base);
  return { page, errors, ctx };
}
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + ".png") }); };
const tab = (page, name) => page.locator(".tabbar button", { hasText: name });

test("kirmagan foydalanuvchi: logo, shior va Google tugmasi", async () => {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 800 } }); const page = await ctx.newPage();
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
