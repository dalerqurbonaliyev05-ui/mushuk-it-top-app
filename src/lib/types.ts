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

export const ANIMAL: Record<AnimalType, { icon: string; label: string }> = {
  cat: { icon: '🐱', label: 'Mushuk' },
  dog: { icon: '🐶', label: 'It' },
};
