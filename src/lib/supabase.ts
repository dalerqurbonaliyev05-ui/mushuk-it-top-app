import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isConfigured } from './config';

export const isNative = Capacitor.isNativePlatform();

// Sozlanmagan bo'lsa ham createClient yiqilmasligi uchun vaqtinchalik qiymat; ilova baribir "sozlanmagan" ekranini ko'rsatadi.
export const supabase = createClient(
  isConfigured ? SUPABASE_URL : 'https://not-configured.supabase.co',
  isConfigured ? SUPABASE_ANON_KEY : 'not-configured',
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      // Androidda Google'dan qaytishni o'zimiz (appUrlOpen) qayta ishlaymiz; brauzerda supabase-js o'zi.
      detectSessionInUrl: !isNative,
    },
  },
);
