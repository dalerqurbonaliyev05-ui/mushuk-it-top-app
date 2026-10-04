# Mushuk va Itlarni Top (mobil ilova)

Ko'chada uchragan mushuk va itlarni suratga olib, GPS joylashuvi bilan e'lon qilish. **React + Vite + TypeScript + Capacitor** (Android APK), backend: **Supabase** (Auth/Google, Postgres + RLS, Storage).
Administrator paneli: `Biotechelectirical` repodagi `yangiloyiha1/mushuk-it-admin/`.

## Imkoniyatlar
- **Kirish:** Google orqali (Supabase Auth); birinchi kirishda ism-sharif va qo'shimcha ma'lumotlarni to'ldirish
- **Bosh sahifa:** qidiruv, «Mushuk»/«It» plitkalari, «Rasmga olish» kartasi, **yaqin atrofdagi e'lonlar** (masofa bo'yicha, «850 m» ko'rinishida), «Barchasi» (to'liq lenta: layk, izoh, lokatsiya)
- **Yangi e'lon:** «Mushuk»/«It» tugmasi → kamera → rasm olingan zahoti **GPS avtomatik** olinadi va saqlanadi (manzil OSM Nominatim orqali) → sarlavha/izoh → yuborish
- **Xarita:** rasmli pinlar (mushuk/it rangida), tur filtri, qidiruv, «men turgan joy», tanlangan e'lon kartasi
- **E'lon tafsilotlari:** sarlavha, lokatsiya (rasm tagida), masofa, mini xarita, Google Maps'da ochish, layk va izohlar
- **Bildirishnomalar:** e'loningizga layk/izoh qoldirilganda (baza triggerlari), o'qilmaganlar belgisi
- **Profil:** statistika (e'lonlar, olingan layklar, yozgan izohlar), mening e'lonlarim, sevimlilarim (layk bosganlarim), izohlarim, sozlamalar, yordam
- **Tillar:** o'zbekcha, русский, English (kirish ekranida va Profil → Sozlamalar'da almashtiriladi; birinchi ochilganda qurilma tiliga qarab tanlanadi, tanlov saqlanadi; Android'dagi ilova nomi ham tilga qarab o'zgaradi)
- **Qorong'u rejim:** Tizim / Yorug' / Qorong'u (Sozlamalar), xarita plitkalari ham qoraytiriladi
- Bloklangan foydalanuvchi uchun alohida ekran; admin bloklagan e'lonlar boshqalarga ko'rinmaydi

Hozircha yo'q: Instagram bilan kirish (Supabase'da Instagram provider yo'q), bir e'londa bir nechta rasm, foydalanuvchilar o'rtasida xabar yozishish (chat).

## Sozlash (bir marta)
1. **Supabase loyihasi** `mushuk-it-top-app` (`mjtdilcbwbqpibrooamz`): sxema (`supabase/schema.sql`) qo'llangan, faqat ikki admin funksiyasi (bloklash/o'chirish) SQL Editor'da qo'lda ishga tushirilishi kerak: [`supabase/admin_block_delete.sql`](supabase/admin_block_delete.sql). Yangi loyiha uchun avval `schema.sql`, so'ng shu faylni ishga tushiring. U `profiles`, `posts`, `likes`, `comments`, `admins` jadvallarini, RLS qoidalarini (hamma o'qiydi, faqat egasi o'chiradi, admin hammasini boshqaradi), `animal-photos` bucket'ini va admin funksiyalarini yaratadi.
2. **Google kirish**: Google Cloud Console'da OAuth Client (Web) yarating (Authorized redirect URI: `https://<loyiha>.supabase.co/auth/v1/callback`). Supabase > Authentication > Providers > Google'ga Client ID/Secret'ni kiriting.
3. Supabase > Authentication > URL Configuration > **Redirect URLs**'ga qo'shing: `uz.mushukit.top://auth/callback` (APK), `https://energyvibe.uz/mushuk-it/app/` (iPhone/brauzer veb-versiyasi) va admin paneli manzili.
   Android'da kirish tizim brauzeri + shu custom-scheme orqali ishlaydi, shuning uchun har bir build'dagi (debug) imzo kaliti (SHA-1) Google tomonda ro'yxatdan o'tkazilishi **shart emas**.
4. Supabase URL va publishable kalit `src/lib/config.ts` da standart qiymat sifatida yozilgan (loyiha `mjtdilcbwbqpibrooamz`), shuning uchun APK qo'shimcha sozlamasiz ishlaydi. Boshqa loyiha uchun GitHub Actions Variables'ga `SUPABASE_URL`, `SUPABASE_ANON_KEY` bering.
5. Admin tayinlash: `insert into public.admins (user_id) select id from auth.users where email = 'sizning@gmail.com';`

## APK
`.github/workflows/build-apk.yml`: har push'da APK yig'iladi (Actions > Artifacts: `mushuk-it-top-apk`), `main`'ga push bo'lsa **Releases**'ga ham yuklanadi. Qo'lda: Actions > Build APK > Run workflow.

## Veb-versiya (iPhone va brauzer, PWA)
iPhone'da APK o'rnatib bo'lmaydi, shuning uchun xuddi shu ilova veb-ilova sifatida ham yig'iladi va saytga qo'yiladi:
**https://energyvibe.uz/mushuk-it/app/** (Safari'da ochib, «Ulashish → Bosh ekranga qo'shish»).

```bash
npm run build:web        # dist-web/ — base /mushuk-it/app/ (boshqa manzil uchun VITE_BASE=/yo'l/)
```
- `--mode web` da `pwa/` (manifest, ikonkalar, favicon) qo'shiladi, `<head>` ga iOS teglari yoziladi va `scripts/sw.template.js` dan
  `sw.js` yaratiladi (fayllar ro'yxati va xeshi bilan). Oddiy `npm run build` (APK) bunga tegmaydi, service worker APK ichida ishlamaydi.
- Kamera: `<input type="file" capture>` (iPhone'da kamera ochiladi), GPS: brauzer geolokatsiyasi (HTTPS kerak),
  Google kirish: brauzer orqali `https://energyvibe.uz/mushuk-it/app/` ga qaytadi (Supabase Redirect URLs'da bo'lishi shart).
- Saytga qo'yish: `dist-web/` ichidagini `Biotechelectirical` repo'sidagi `mushuk-it/app/` ga ko'chiring.
- Test: `npm run build:test-web && cd tests && node --test pwa.test.mjs` (manifest, offline, Google'dan qaytish, "orqaga").

## Lokal ishga tushirish
```bash
cp .env.example .env     # Supabase URL va kalitni yozing
npm install
npm run dev              # http://localhost:5181 (brauzerda kamera o'rniga fayl tanlanadi)
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug   # JDK 17 + Android SDK kerak
```

## Android ruxsatlari
`CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` (AndroidManifest.xml). Joylashuv ruxsati berilmasa, e'lon yuborib bo'lmaydi (joylashuv majburiy).

## Tuzilishi
`src/i18n/` (uz/en/ru lug'atlari: yangi matn qo'shsangiz uchala tilda ham kiritish shart, aks holda TypeScript xato beradi), `src/lib/` (Supabase mijozi, mavzu, auth, joylashuv, navigatsiya, kamera, rasm siqish, postlar API), `src/components/` (ikonkalar, PostRow/PostCard, xarita), `src/pages/` (Home, MapPage, PostDetail, NewPost, Notifications, ProfilePage, ...), `assets/logo.svg` (logo; Android ikonkalari shundan yaratilgan), `supabase/`.

Sinov: `npm run build:test`, so'ng `cd tests && npm install && npm test` (haqiqiy Chromium, Supabase tarmoq darajasida taqlid qilinadi).
