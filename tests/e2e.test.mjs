// Ilova e2e: dist-test/ (soxta Supabase URL bilan build qilingan) haqiqiy Chromium'da ochiladi, Supabase REST/Storage tarmoq darajasida taqlid qilinadi.
// Kamera brauzerda fayl tanlash oynasi sifatida ishlaydi (filechooser), GPS Playwright geolocation orqali.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist-test");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
const CHROME = process.env.CHROMIUM_PATH || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => fs.existsSync(p));
const SB = "https://testproj.supabase.co";
const ME = "u-me";

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
});
after(async () => { await browser?.close(); server?.close(); });

const photoUrl = (uid, n) => `${SB}/storage/v1/object/public/animal-photos/${uid}/${n}.jpg`;
function seed({ onboarded = true, blocked = false } = {}) {
  return {
    profiles: [{ user_id: ME, full_name: "Ali", google_id: "g", avatar_url: null, phone: null, city: null, bio: null, onboarded, blocked, created_at: "2026-01-01T00:00:00Z" }],
    public_profiles: [{ user_id: ME, full_name: "Ali Valiyev", avatar_url: null }, { user_id: "u-bek", full_name: "Bek Karimov", avatar_url: null }],
    posts: [
      { id: "p1", user_id: "u-bek", animal_type: "dog", image_url: photoUrl("u-bek", 1), latitude: 41.2995, longitude: 69.2401, address: "Amir Temur ko'chasi, Toshkent", caption: "Qora it, yo'lak yonida", status: "active", created_at: new Date(Date.now() - 3600e3).toISOString(), likes: [{ count: 2 }], comments: [{ count: 1 }] },
    ],
    mylikes: [], comments: [{ id: "c1", post_id: "p1", user_id: "u-bek", text: "Hozir ham shu yerda", created_at: new Date().toISOString() }],
    uploads: [], calls: [],
  };
}

async function openApp(db, { configured = true } = {}) {
  const ctx = await browser.newContext({ geolocation: { latitude: 41.3111, longitude: 69.2797, accuracy: 12 }, permissions: ["geolocation"], viewport: { width: 400, height: 800 } });
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
    db.calls.push({ m, t, path: u.pathname, search: u.search, body: req.postData() });
    if (u.pathname.startsWith("/storage/v1/object/animal-photos/") && m === "POST") { db.uploads.push(u.pathname.replace("/storage/v1/object/animal-photos/", "")); return json({ Key: "animal-photos/x" }); }
    if (u.pathname.startsWith("/rest/v1/")) {
      const single = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
      if (m === "GET") {
        let rows = t === "likes" ? db.mylikes : db[t] || [];
        if (t === "comments") rows = rows.filter((c) => c.post_id === u.searchParams.get("post_id")?.replace("eq.", ""));
        if (t === "posts" && u.searchParams.get("user_id")) rows = rows.filter((p) => p.user_id === u.searchParams.get("user_id").replace("eq.", ""));
        const off = Number(u.searchParams.get("offset") || 0);
        if (off) rows = [];
        if (single) return rows[0] ? json(rows[0]) : route.fulfill({ status: 406, headers: cors, contentType: "application/json", body: JSON.stringify({ code: "PGRST116", message: "0 rows" }) });
        return json(rows);
      }
      if (m === "PATCH") { Object.assign(db.profiles[0], JSON.parse(req.postData())); return route.fulfill({ status: 204, headers: cors }); }
      if (m === "POST") {
        const b = JSON.parse(req.postData());
        if (t === "likes") { db.mylikes.push({ post_id: b.post_id }); db.posts.find((p) => p.id === b.post_id).likes[0].count++; }
        if (t === "comments") { db.comments.push({ id: "c" + db.comments.length + 1, ...b, created_at: new Date().toISOString() }); }
        if (t === "posts") { db.posts.unshift({ id: "pn", status: "active", created_at: new Date().toISOString(), likes: [{ count: 0 }], comments: [{ count: 0 }], ...b }); db.newPost = b; }
        return route.fulfill({ status: 201, headers: cors });
      }
      if (m === "DELETE") { if (t === "likes") { db.mylikes = []; db.posts[0].likes[0].count--; } return route.fulfill({ status: 204, headers: cors }); }
    }
    return json({ message: "mock yo'q: " + m + " " + u.pathname }, 404);
  });
  await page.addInitScript((me) => {
    localStorage.setItem("sb-testproj-auth-token", JSON.stringify({ access_token: "a.b.c", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: me, email: "ali@x.uz", user_metadata: {} } }));
  }, ME);
  await page.goto(configured ? base : `${base}/index.html`);
  return { page, errors, ctx };
}

test("kirmagan foydalanuvchi: Google tugmasi", async () => {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(base);
  await page.getByText("Google orqali kirish").waitFor();
  assert.match(await page.locator("h1").innerText(), /Mushuk va It Top/);
  await ctx.close();
});

test("birinchi kirish: profil to'ldirish (ism-sharif majburiy), so'ng lenta", async () => {
  const db = seed({ onboarded: false });
  const { page, errors, ctx } = await openApp(db);
  await page.getByText("Profilingizni to'ldiring").waitFor();
  await page.locator("input").first().fill("Ali");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await page.getByText(/to'liq kiriting/).waitFor();
  await page.locator("input").first().fill("Ali Valiyev");
  await page.locator("input").nth(1).fill("+998901234567");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await page.locator(".post").waitFor();
  assert.equal(db.profiles[0].onboarded, true);
  assert.equal(db.profiles[0].full_name, "Ali Valiyev");
  assert.equal(db.profiles[0].phone, "+998901234567");
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("lenta: rasm, muallif, lokatsiya rasm tagida; layk (optimistik) va izoh", async () => {
  const db = seed();
  const { page, errors, ctx } = await openApp(db);
  const post = page.locator(".post").first();
  await post.waitFor();
  assert.match(await post.innerText(), /Bek Karimov/);
  assert.match(await post.innerText(), /Amir Temur ko'chasi/);
  assert.match(await post.innerText(), /41\.29950, 69\.24010/);
  assert.ok(await post.locator("img.post-img").evaluate((i) => i.complete && i.naturalWidth > 0), "rasm yuklanishi kerak");
  // lokatsiya bloki rasmdan keyin keladi
  assert.ok(await post.evaluate((el) => el.querySelector(".post-img").compareDocumentPosition(el.querySelector(".loc")) & Node.DOCUMENT_POSITION_FOLLOWING));
  // layk
  await post.getByRole("button", { name: /🤍 2/ }).click();
  await post.getByRole("button", { name: /❤️ 3/ }).waitFor();
  assert.deepEqual(db.mylikes, [{ post_id: "p1" }]);
  await post.getByRole("button", { name: /❤️ 3/ }).click();
  await post.getByRole("button", { name: /🤍 2/ }).waitFor();
  // izoh
  await post.getByRole("button", { name: /💬 1/ }).click();
  await page.getByText("Hozir ham shu yerda").waitFor();
  await page.fill(".comment-form input", "Men ham ko'rdim");
  await page.getByRole("button", { name: "Yuborish" }).click();
  await page.getByText("Men ham ko'rdim").waitFor();
  assert.equal(db.comments.at(-1).text, "Men ham ko'rdim");
  assert.equal(db.comments.at(-1).user_id, ME);
  await page.locator(".sheet .x").click();
  await post.getByRole("button", { name: /💬 2/ }).waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("lokatsiyani ochish: ilova ichidagi xarita va Google Maps havolasi", async () => {
  const db = seed();
  const { page, errors, ctx } = await openApp(db);
  await page.locator(".post").waitFor();
  await page.getByRole("button", { name: /Xarita/ }).first().click();
  await page.locator(".leaflet-container").waitFor();
  assert.ok(await page.locator(".map-pin").count() >= 1, "marker bo'lishi kerak");
  assert.match(await page.locator(".sheet").innerText(), /Amir Temur ko'chasi/);
  await ctx.route("https://www.google.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>maps</title>" }));
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: /Google Maps'da ochish/ }).click()]);
  assert.match(popup.url(), /google\.com\/maps\/search\/\?api=1&query=41\.2995%2C69\.2401|google\.com\/maps\/search\/\?api=1&query=41\.2995,69\.2401/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("yangi e'lon: kategoriya -> kamera -> GPS avtomatik -> yuborish (Storage + posts)", async () => {
  const db = seed();
  const { page, errors, ctx } = await openApp(db);
  await page.locator(".post").waitFor();
  await page.locator(".tabbar .add").click();
  page.once("filechooser", (fc) => fc.setFiles({ name: "cat.jpg", mimeType: "image/jpeg", buffer: JPEG }));
  await page.locator(".cat-btn", { hasText: "Mushuk" }).click();
  await page.getByText("E'lonni tasdiqlang").waitFor();
  const loc = await page.locator(".loc.solo").innerText();
  assert.match(loc, /Navoiy ko'chasi/);
  assert.match(loc, /41\.31110, 69\.27970/);
  await page.fill("textarea", "Oq mushuk, qo'rqmaydi");
  await page.getByRole("button", { name: "E'lon qilish" }).click();
  await page.locator(".post").first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".post").length === 2);
  assert.equal(db.uploads.length, 1);
  assert.match(db.uploads[0], new RegExp(`^${ME}/[0-9a-f-]{36}\\.jpg$`), "rasm egasining o'z papkasiga yuklanadi");
  const b = db.newPost;
  assert.equal(b.user_id, ME); assert.equal(b.animal_type, "cat");
  assert.equal(b.latitude, 41.3111); assert.equal(b.longitude, 69.2797);
  assert.equal(b.address, "Navoiy ko'chasi, Mirzo Ulug'bek, Toshkent");
  assert.equal(b.caption, "Oq mushuk, qo'rqmaydi");
  assert.ok(b.image_url.startsWith(`${SB}/storage/v1/object/public/animal-photos/${ME}/`));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("joylashuv ruxsati yo'q: e'lon yuborib bo'lmaydi", async () => {
  const db = seed();
  const { page, ctx } = await openApp(db);
  await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = (_ok, err) => err({ code: 1, message: "User denied Geolocation" }); });
  await page.reload();
  await page.locator(".post").waitFor();
  await page.locator(".tabbar .add").click();
  page.once("filechooser", (fc) => fc.setFiles({ name: "dog.jpg", mimeType: "image/jpeg", buffer: JPEG }));
  await page.locator(".cat-btn", { hasText: "It" }).click();
  await page.getByText(/Joylashuv olinmadi/).waitFor();
  assert.ok(await page.getByRole("button", { name: "E'lon qilish" }).isDisabled());
  await ctx.close();
});

test("bloklangan foydalanuvchi: bloklangan ekran", async () => {
  const db = seed({ blocked: true });
  const { page, ctx } = await openApp(db);
  await page.getByText("Hisobingiz bloklangan").waitFor();
  assert.equal(await page.locator(".tabbar").count(), 0);
  await ctx.close();
});

test("profil sahifasi: mening e'lonlarim va chiqish", async () => {
  const db = seed();
  db.posts.push({ ...db.posts[0], id: "p2", user_id: ME, caption: "Mening itim" });
  const { page, ctx } = await openApp(db);
  await page.locator(".post").first().waitFor();
  await page.locator(".tabbar button", { hasText: "Profil" }).click();
  await page.getByText("Mening e'lonlarim").waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".post").length === 1);
  assert.match(await page.locator(".post").innerText(), /Mening itim/);
  assert.ok(await page.getByRole("button", { name: "O'chirish" }).count() >= 1, "o'z postini o'chirish tugmasi bor");
  await ctx.close();
});
