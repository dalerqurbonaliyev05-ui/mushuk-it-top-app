// Supabase ulanishi: qiymatlar build vaqtida (.env yoki GitHub Actions Variables) beriladi.
export const SUPABASE_URL: string = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY: string = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
export const isConfigured = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 10;

export const BUCKET = 'animal-photos';
/** Google'dan keyin ilovaga qaytish manzili (AndroidManifest'dagi intent-filter va Supabase Redirect URLs bilan bir xil). */
export const NATIVE_REDIRECT = 'uz.mushukit.top://auth/callback';
