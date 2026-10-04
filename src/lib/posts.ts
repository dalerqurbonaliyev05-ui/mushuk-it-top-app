import { supabase } from './supabase';
import { BUCKET } from './config';
import { storagePath } from './format';
import { distanceKm, type Fix } from './geo';
import type { AnimalType, CommentRow, NotificationRow, Post, PublicProfile } from './types';

export interface FeedPost extends Post {
  author: PublicProfile | null;
  liked: boolean;
}
export interface FeedComment extends CommentRow {
  author: PublicProfile | null;
}
export interface NotifItem extends NotificationRow {
  actor: PublicProfile | null;
  post: Pick<Post, 'id' | 'title' | 'animal_type' | 'image_url'> | null;
}
export interface MyComment {
  id: string;
  post_id: string;
  text: string;
  created_at: string;
  post: Pick<Post, 'id' | 'title' | 'animal_type' | 'image_url'> | null;
}

export const PAGE_SIZE = 10;
const SELECT = '*, likes(count), comments(count)';

/** PostgREST filtr qiymatidan xavfli belgilarni olib tashlaydi. */
const clean = (q: string) => q.replace(/[,()*%\\:]/g, ' ').trim();

/** Kichik rasm (thumbnail) manzili: <uuid>.jpg -> <uuid>_t.jpg. Eski postlarda bo'lmasa, <img onError> to'liq rasmga qaytadi. */
export const thumbUrl = (url: string) => url.replace(/\.jpg$/, '_t.jpg');

async function authorsOf(userIds: string[]): Promise<Map<string, PublicProfile>> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return new Map();
  const { data, error } = await supabase.from('public_profiles').select('user_id, full_name, avatar_url').in('user_id', ids);
  if (error) throw error;
  return new Map((data as PublicProfile[]).map((p) => [p.user_id, p]));
}

async function enrich(me: string, posts: Post[], withLiked = true): Promise<FeedPost[]> {
  if (!posts.length) return [];
  const [authors, mine] = await Promise.all([
    authorsOf(posts.map((p) => p.user_id)),
    withLiked
      ? supabase.from('likes').select('post_id').eq('user_id', me).in('post_id', posts.map((p) => p.id))
      : Promise.resolve({ data: [] as { post_id: string }[], error: null }),
  ]);
  if (mine.error) throw mine.error;
  const liked = new Set((mine.data ?? []).map((l: { post_id: string }) => l.post_id));
  return posts.map((p) => ({ ...p, author: authors.get(p.user_id) ?? null, liked: liked.has(p.id) }));
}

export interface PostQuery { from?: number; size?: number; userId?: string; type?: AnimalType | null; q?: string }

/** E'lonlar lentasi: yangisi birinchi; ixtiyoriy: foydalanuvchi, hayvon turi, qidiruv (sarlavha/izoh/manzil). */
export async function fetchPosts(me: string, o: PostQuery = {}): Promise<FeedPost[]> {
  const from = o.from ?? 0, size = o.size ?? PAGE_SIZE;
  let q = supabase.from('posts').select(SELECT).order('created_at', { ascending: false }).range(from, from + size - 1);
  if (o.userId) q = q.eq('user_id', o.userId);
  if (o.type) q = q.eq('animal_type', o.type);
  const t = clean(o.q ?? '');
  if (t) q = q.or(`title.ilike.*${t}*,caption.ilike.*${t}*,address.ilike.*${t}*`);
  const { data, error } = await q;
  if (error) throw error;
  return enrich(me, (data ?? []) as Post[]);
}

/** Yaqin atrofdagi e'lonlar: joylashuv atrofidagi ~50 km ichidan masofa bo'yicha saralanadi. Joylashuv yo'q yoki hech narsa topilmasa, eng yangilari. */
export async function fetchNearby(me: string, fix: Fix | null, o: { type?: AnimalType | null; limit?: number } = {}): Promise<FeedPost[]> {
  const limit = o.limit ?? 10;
  if (fix) {
    const dLat = 0.45, dLng = 0.45 / Math.max(0.2, Math.cos((fix.lat * Math.PI) / 180));
    let q = supabase.from('posts').select(SELECT)
      .gte('latitude', fix.lat - dLat).lte('latitude', fix.lat + dLat).gte('longitude', fix.lng - dLng).lte('longitude', fix.lng + dLng)
      .order('created_at', { ascending: false }).limit(100);
    if (o.type) q = q.eq('animal_type', o.type);
    const { data, error } = await q;
    if (error) throw error;
    const near = ((data ?? []) as Post[])
      .map((p) => ({ p, d: distanceKm(fix, { lat: p.latitude, lng: p.longitude }) }))
      .sort((a, b) => a.d - b.d).slice(0, limit).map((x) => x.p);
    if (near.length) return enrich(me, near);
  }
  return fetchPosts(me, { size: limit, type: o.type });
}

/** Xarita uchun: so'nggi 200 ta e'lon (like holati kerak emas). */
export async function fetchMapPosts(me: string): Promise<FeedPost[]> {
  const { data, error } = await supabase.from('posts').select(SELECT).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return enrich(me, (data ?? []) as Post[], false);
}

export async function fetchPost(me: string, id: string): Promise<FeedPost | null> {
  const { data, error } = await supabase.from('posts').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await enrich(me, [data as Post]))[0] ?? null;
}

/** Layk bosgan e'lonlarim (Sevimlilar). */
export async function fetchLiked(me: string, from = 0, size = PAGE_SIZE): Promise<FeedPost[]> {
  const { data, error } = await supabase.from('likes').select(`created_at, posts(${SELECT})`)
    .eq('user_id', me).order('created_at', { ascending: false }).range(from, from + size - 1);
  if (error) throw error;
  const posts = ((data ?? []) as unknown as { posts: Post | null }[]).map((r) => r.posts).filter((p): p is Post => !!p);
  return enrich(me, posts);
}

export async function fetchMyComments(me: string): Promise<MyComment[]> {
  const { data, error } = await supabase.from('comments').select('id, post_id, text, created_at, posts(id, title, animal_type, image_url)')
    .eq('user_id', me).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return ((data ?? []) as unknown as (Omit<MyComment, 'post'> & { posts: MyComment['post'] })[]).map(({ posts, ...c }) => ({ ...c, post: posts }));
}

export interface Stats { posts: number; likes: number; comments: number }
/** Profil statistikasi: e'lonlarim, e'lonlarimga bosilgan layklar, yozgan izohlarim. */
export async function fetchStats(me: string): Promise<Stats> {
  const head = { count: 'exact' as const, head: true };
  const [p, l, c] = await Promise.all([
    supabase.from('posts').select('id', head).eq('user_id', me),
    supabase.from('likes').select('id, posts!inner(user_id)', head).eq('posts.user_id', me),
    supabase.from('comments').select('id', head).eq('user_id', me),
  ]);
  for (const r of [p, l, c]) if (r.error) throw r.error;
  return { posts: p.count ?? 0, likes: l.count ?? 0, comments: c.count ?? 0 };
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
  const paths = [storagePath(post.image_url, BUCKET), storagePath(thumbUrl(post.image_url), BUCKET)].filter((x): x is string => !!x);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);   // rasm qolib ketsa ham post o'chgan: xatoni yutamiz
}

// ---------- Bildirishnomalar ----------
export async function fetchNotifications(me: string, type?: 'like' | 'comment'): Promise<NotifItem[]> {
  let q = supabase.from('notifications').select('*, posts(id, title, animal_type, image_url)').eq('user_id', me).order('created_at', { ascending: false }).limit(100);
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as (NotificationRow & { posts: NotifItem['post'] })[];
  const actors = await authorsOf(rows.map((r) => r.actor_id));
  return rows.map(({ posts, ...n }) => ({ ...n, actor: actors.get(n.actor_id) ?? null, post: posts }));
}

export async function unreadCount(me: string): Promise<number> {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', me).eq('read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.from('notifications').update({ read: true }).in('id', ids);
  if (error) throw error;
}

// ---------- Yangi e'lon ----------
export interface NewPost {
  userId: string;
  animal: AnimalType;
  title: string;
  image: Blob;
  thumb: Blob;
  lat: number;
  lng: number;
  address: string | null;
  caption: string;
}

/** Rasm va kichik nusxasini Storage'ga yuklaydi, so'ng postni yozadi. Post yozilmasa, yuklangan fayllar o'chiriladi. */
export async function createPost(n: NewPost): Promise<void> {
  const base = `${n.userId}/${crypto.randomUUID()}`;
  const path = `${base}.jpg`, tpath = `${base}_t.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(path, n.image, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (up.error) throw up.error;
  const tu = await supabase.storage.from(BUCKET).upload(tpath, n.thumb, { contentType: 'image/jpeg', cacheControl: '31536000' });
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error } = tu.error ? { error: tu.error } : await supabase.from('posts').insert({
    user_id: n.userId, animal_type: n.animal, title: n.title.trim() || null, image_url: data.publicUrl,
    latitude: n.lat, longitude: n.lng, address: n.address, caption: n.caption.trim() || null,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path, tpath]);
    throw error;
  }
}
