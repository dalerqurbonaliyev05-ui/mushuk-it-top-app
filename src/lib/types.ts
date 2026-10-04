export type AnimalType = 'cat' | 'dog';

export interface Profile {
  user_id: string;
  full_name: string;
  google_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  city: string | null;
  bio: string | null;
  onboarded: boolean;
  blocked: boolean;
  created_at: string;
}

/** Boshqalarga ko'rinadigan profil qismi (public_profiles ko'rinishi). */
export interface PublicProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface Post {
  id: string;
  user_id: string;
  animal_type: AnimalType;
  title: string | null;
  image_url: string;
  latitude: number;
  longitude: number;
  address: string | null;
  caption: string | null;
  status: 'active' | 'blocked';
  created_at: string;
  likes: { count: number }[];
  comments: { count: number }[];
}

export interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'like' | 'comment';
  post_id: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

import { tr } from '../i18n';

export const ANIMAL: Record<AnimalType, { icon: string }> = { cat: { icon: '🐱' }, dog: { icon: '🐶' } };
export const animalLabel = (t: AnimalType) => tr(t === 'cat' ? 'animal.cat' : 'animal.dog');
export const animalPlural = (t: AnimalType) => tr(t === 'cat' ? 'animal.cats' : 'animal.dogs');

/** E'lon sarlavhasi; kiritilmagan bo'lsa hayvon turi (joriy tilda). */
export function postTitle(p: Pick<Post, 'title' | 'animal_type'>): string {
  return p.title?.trim() || animalLabel(p.animal_type);
}
