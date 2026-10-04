import { Browser } from '@capacitor/browser';
import { isNative } from './supabase';

/** Havolani tashqi brauzerda (Android'da tizim brauzeri/Google Maps) ochadi. */
export async function openExternal(url: string): Promise<void> {
  if (isNative) await Browser.open({ url });
  else window.open(url, '_blank', 'noopener,noreferrer');
}
