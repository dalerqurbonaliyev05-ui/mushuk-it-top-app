# Mushuk va It Top (mobil ilova)

Ko'chada uchragan mushuk va itlarni suratga olib, GPS joylashuvi bilan e'lon qilish. **React + Vite + TypeScript + Capacitor** (Android APK), backend: **Supabase** (Auth/Google, Postgres + RLS, Storage).
Administrator paneli: `Biotechelectirical` repodagi `yangiloyiha1/mushuk-it-admin/`.

## Imkoniyatlar
- Google orqali kirish (Supabase Auth); birinchi kirishda ism-sharif va qo'shimcha ma'lumotlarni to'ldirish
- «Mushuk» / «It» tugmasi → kamera → rasm olingan zahoti **GPS joylashuvi avtomatik** olinadi va saqlanadi (manzil OpenStreetMap Nominatim orqali)
- Lenta: barcha foydalanuvchilar postlari, **rasm tagida joylashuv**; layk va izoh
- Joylashuvni ilova ichidagi xaritada (Leaflet/OSM) yoki Google Maps'da ochish
- Bloklangan foydalanuvchi uchun alohida ekran; admin bloklagan postlar boshqalarga ko'rinmaydi

## Sozlash (bir marta)
1. **Supabase loyihasi** (alohida loyiha tavsiya etiladi): SQL Editor'da [`supabase/schema.sql`](supabase/schema.sql) ni ishga tushiring. U `profiles`, `posts`, `likes`, `comments`, `admins` jadvallarini, RLS qoidalarini (hamma o'qiydi, faqat egasi o'chiradi, admin hammasini boshqaradi), `animal-photos` bucket'ini va admin funksiyalarini yaratadi.
2. **Google kirish**: Google Cloud Console'da OAuth Client (Web) yarating (Authorized redirect URI: `https://<loyiha>.supabase.co/auth/v1/callback`). Supabase > Authentication > Providers > Google'ga Client ID/Secret'ni kiriting.
3. Supabase > Authentication > URL Configuration > **Redirect URLs**'ga qo'shing: `uz.mushukit.top://auth/callback` (APK) va admin paneli manzili.
   Android'da kirish tizim brauzeri + shu custom-scheme orqali ishlaydi, shuning uchun har bir build'dagi (debug) imzo kaliti (SHA-1) Google tomonda ro'yxatdan o'tkazilishi **shart emas**.
4. **GitHub Actions Variables** (Settings > Secrets and variables > Actions > Variables): `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable/anon kalit).
5. Admin tayinlash: `insert into public.admins (user_id) select id from auth.users where email = 'sizning@gmail.com';`

## APK
`.github/workflows/build-apk.yml`: har push'da APK yig'iladi (Actions > Artifacts: `mushuk-it-top-apk`), `main`'ga push bo'lsa **Releases**'ga ham yuklanadi. Qo'lda: Actions > Build APK > Run workflow.

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
`src/lib/` (Supabase mijozi, auth, kamera, GPS, rasm siqish, postlar API), `src/components/` (PostCard, izohlar, xarita), `src/pages/` (Login, ProfileForm, Feed, NewPost, ProfilePage), `supabase/schema.sql`.
