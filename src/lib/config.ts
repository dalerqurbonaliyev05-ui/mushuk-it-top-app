// Supabase ulanishi. Standart qiymatlar: mushuk-it-top-app loyihasi. Boshqa loyiha uchun build vaqtida
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (.env yoki GitHub Actions Variables) bering.
// Publishable kalit ochiq bo'lishi mo'ljallangan (himoyani RLS beradi); service_role kalitini bu yerga HECH QACHON yozmang.
const DEFAULT_URL = 'https://mjtdilcbwbqpibrooamz.supabase.co';
const DEFAULT_KEY = 'sb_publishable_i8-W2hBST_dego84ZBdXCg_mfHXMzFo';
export const SUPABASE_URL: string = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).trim();
export const SUPABASE_ANON_KEY: string = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY).trim();
export const isConfigured = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 10;

export const BUCKET = 'animal-photos';
/** Google'dan keyin ilovaga qaytish manzili (AndroidManifest'dagi intent-filter va Supabase Redirect URLs bilan bir xil). */
export const NATIVE_REDIRECT = 'uz.mushukit.top://auth/callback';
