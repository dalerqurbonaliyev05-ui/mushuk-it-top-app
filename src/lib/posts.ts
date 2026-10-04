import { supabase } from './supabase';
import { BUCKET } from './config';
import { storagePath } from './format';
import type { AnimalType, CommentRow, Post, PublicProfile } from './types';

export interface FeedPost extends Post {
  author: PublicProfile | null;
  liked: boolean;
}
export interface FeedComment extends CommentRow {
  author: PublicProfile | null;
}

export const PAGE_SIZE = 10;

async function authorsOf(userIds: string[]): Promise<Map<string, PublicProfile>> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return new Map();
  const { data, error } = await supabase.from('public_profiles').select('user_id, full_name, avatar_url').in('user_id', ids);
  if (error) throw error;
  return new Map((data as PublicProfile[]).map((p) => [p.user_id, p]));
}

/** Yangilanish lentasi: barcha foydalanuvchilarning postlari (yangisi birinchi). userId berilsa, faqat shu foydalanuvchiniki. */
export async function fetchFeed(me: string, from: number, size = PAGE_SIZE, userId?: string): Promise<FeedPost[]> {
  let q = supabase.from('posts').select('*, likes(count), comments(count)').order('created_at', { ascending: false }).range(from, from + size - 1);
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) throw error;
  const posts = (data ?? []) as Post[];
  if (!posts.length) return [];
  const [authors, mine] = await Promise.all([
    authorsOf(posts.map((p) => p.user_id)),
    supabase.from('likes').select('post_id').eq('user_id', me).in('post_id', posts.map((p) => p.id)),
  ]);
  if (mine.error) throw mine.error;
  const liked = new Set((mine.data ?? []).map((l: { post_id: string }) => l.post_id));
  return posts.map((p) => ({ ...p, author: authors.get(p.user_id) ?? null, liked: liked.has(p.id) }));
}

export async function setLike(postId: string, me: string, on: boolean): Promise<void> {
  if (on) {
    const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: me });
    if (error && error.code !== '23505') throw error;   // 23505: allaqachon layk qo'yilgan
  } else {
    const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', me);
    if (error) throw error;
  }
}

export async function fetchComments(postId: string): Promise<FeedComment[]> {
  const { data, error } = await supabase.from('comments').select('id, post_id, user_id, text, created_at').eq('post_id', postId).order('created_at').limit(200);
  if (error) throw error;
  const rows = (data ?? []) as CommentRow[];
  const authors = await authorsOf(rows.map((c) => c.user_id));
  return rows.map((c) => ({ ...c, author: authors.get(c.user_id) ?? null }));
}

export async function addComment(postId: string, me: string, text: string): Promise<void> {
  const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: me, text: text.trim() });
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}

export async function deletePost(post: Pick<Post, 'id' | 'image_url'>): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', post.id);
  if (error) throw error;
  const path = storagePath(post.image_url, BUCKET);
  if (path) await supabase.storage.from(BUCKET).remove([path]);   // rasm qolib ketsa ham post o'chgan: xatoni yutamiz
}

export interface NewPost {
  userId: string;
  animal: AnimalType;
  image: Blob;
  lat: number;
  lng: number;
  address: string | null;
  caption: string;
}

/** Rasmni Storage'ga yuklaydi va postni yozadi. Post yozilmasa, yuklangan rasm o'chiriladi. */
export async function createPost(n: NewPost): Promise<void> {
  const path = `${n.userId}/${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(path, n.image, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (up.error) throw up.error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error } = await supabase.from('posts').insert({
    user_id: n.userId, animal_type: n.animal, image_url: data.publicUrl,
    latitude: n.lat, longitude: n.lng, address: n.address, caption: n.caption.trim() || null,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
}
