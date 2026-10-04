import { useState } from 'react';
import { Avatar } from './Avatar';
import { CommentsSheet } from './CommentsSheet';
import { MapModal } from './MapModal';
import { deletePost, setLike, type FeedPost } from '../lib/posts';
import { fmtCoords, mapsUrl } from '../lib/geo';
import { timeAgo } from '../lib/format';
import { openExternal } from '../lib/open';
import { ANIMAL } from '../lib/types';

interface Props {
  post: FeedPost;
  me: string;
  onChange: (p: FeedPost) => void;
  onDeleted: (id: string) => void;
}

export function PostCard({ post, me, onChange, onDeleted }: Props) {
  const [showMap, setShowMap] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [busy, setBusy] = useState(false);
  const likes = post.likes[0]?.count ?? 0;
  const comments = post.comments[0]?.count ?? 0;
  const a = ANIMAL[post.animal_type];

  async function toggleLike() {
    if (busy) return;
    const on = !post.liked;
    setBusy(true);
    onChange({ ...post, liked: on, likes: [{ count: Math.max(0, likes + (on ? 1 : -1)) }] });   // darhol ko'rsatamiz
    try { await setLike(post.id, me, on); }
    catch { onChange(post); }   // xato bo'lsa qaytaramiz
    setBusy(false);
  }
  async function remove() {
    if (!window.confirm('E\'loningizni o\'chirasizmi?')) return;
    try { await deletePost(post); onDeleted(post.id); }
    catch (e) { window.alert(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <article className="post">
      <header className="post-head">
        <Avatar name={post.author?.full_name ?? '?'} url={post.author?.avatar_url ?? null} />
        <div className="grow">
          <b>{post.author?.full_name ?? 'Foydalanuvchi'}</b>
          <div className="muted small">{timeAgo(post.created_at)}</div>
        </div>
        <span className="chip">{a.icon} {a.label}</span>
        {post.user_id === me && <button className="link bad" onClick={() => void remove()}>O&apos;chirish</button>}
      </header>
      <img className="post-img" src={post.image_url} alt={a.label} loading="lazy" />
      {post.status === 'blocked' && <div className="alert err tight">Bu e&apos;lon administrator tomonidan bloklangan, boshqalarga ko&apos;rinmaydi.</div>}
      {/* Lokatsiya rasm tagida avtomatik ko'rsatiladi */}
      <div className="loc">
        <div className="loc-text">📍 {post.address ?? 'Manzil aniqlanmagan'}<div className="muted small">{fmtCoords(post.latitude, post.longitude)}</div></div>
        <button className="btn small" onClick={() => setShowMap(true)}>🗺 Xarita</button>
        <button className="btn small ghost" onClick={() => void openExternal(mapsUrl(post.latitude, post.longitude))}>Google Maps</button>
      </div>
      {post.caption && <p className="caption">{post.caption}</p>}
      <div className="actions">
        <button className={`act ${post.liked ? 'liked' : ''}`} onClick={() => void toggleLike()} aria-pressed={post.liked}>{post.liked ? '❤️' : '🤍'} {likes}</button>
        <button className="act" onClick={() => setShowComments(true)}>💬 {comments}</button>
      </div>
      {showMap && <MapModal lat={post.latitude} lng={post.longitude} address={post.address} onClose={() => setShowMap(false)} />}
      {showComments && (
        <CommentsSheet postId={post.id} me={me} onClose={() => setShowComments(false)}
          onCountChange={(d) => onChange({ ...post, comments: [{ count: Math.max(0, comments + d) }] })} />
      )}
    </article>
  );
}
