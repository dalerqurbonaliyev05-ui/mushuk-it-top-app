import { useState } from 'react';
import { Avatar } from './Avatar';
import { CommentsSheet } from './CommentsSheet';
import { MapModal } from './MapModal';
import { Icon } from './Icons';
import { TypeBadge } from './Chips';
import { deletePost, setLike, type FeedPost } from '../lib/posts';
import { fmtCoords, mapsUrl } from '../lib/geo';
import { useMyLocation } from '../lib/location';
import { timeAgo } from '../lib/format';
import { openExternal } from '../lib/open';
import { postTitle } from '../lib/types';

interface Props {
  post: FeedPost;
  me: string;
  onOpen: (id: string) => void;
  onChange: (p: FeedPost) => void;
  onDeleted: (id: string) => void;
}

/** Lenta kartasi: rasm tagida lokatsiya, layk va izoh. Rasm/sarlavhani bosish tafsilotlarni ochadi. */
export function PostCard({ post, me, onOpen, onChange, onDeleted }: Props) {
  const { distanceTo } = useMyLocation();
  const [showMap, setShowMap] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [busy, setBusy] = useState(false);
  const likes = post.likes[0]?.count ?? 0;
  const comments = post.comments[0]?.count ?? 0;
  const dist = distanceTo(post.latitude, post.longitude);

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
        <TypeBadge type={post.animal_type} />
        {post.user_id === me && <button className="icon-btn danger" onClick={() => void remove()} aria-label="O'chirish"><Icon name="trash" size={19} /></button>}
      </header>
      <button className="img-btn" onClick={() => onOpen(post.id)} aria-label="Tafsilotlar">
        <img className="post-img" src={post.image_url} alt={postTitle(post)} loading="lazy" />
      </button>
      {post.status === 'blocked' && <div className="alert err tight">Bu e&apos;lon administrator tomonidan bloklangan, boshqalarga ko&apos;rinmaydi.</div>}
      <div className="post-info">
        <b className="post-title">{postTitle(post)}</b>
        {post.caption && <p className="caption">{post.caption}</p>}
      </div>
      {/* Lokatsiya rasm tagida avtomatik ko'rsatiladi */}
      <div className="loc">
        <div className="loc-text"><Icon name="pin" size={16} /> {post.address ?? 'Manzil aniqlanmagan'}{dist ? ` · ${dist}` : ''}<div className="muted small">{fmtCoords(post.latitude, post.longitude)}</div></div>
        <button className="btn small" onClick={() => setShowMap(true)}>Xarita</button>
        <button className="btn small ghost" onClick={() => void openExternal(mapsUrl(post.latitude, post.longitude))}>Google Maps</button>
      </div>
      <div className="actions">
        <button className={`act like ${post.liked ? 'on' : ''}`} onClick={() => void toggleLike()} aria-pressed={post.liked}><Icon name="heart" size={18} fill={post.liked} /> {likes}</button>
        <button className="act comment" onClick={() => setShowComments(true)}><Icon name="comment" size={18} /> {comments}</button>
      </div>
      {showMap && <MapModal lat={post.latitude} lng={post.longitude} address={post.address} onClose={() => setShowMap(false)} />}
      {showComments && (
        <CommentsSheet postId={post.id} me={me} onClose={() => setShowComments(false)}
          onCountChange={(d) => onChange({ ...post, comments: [{ count: Math.max(0, comments + d) }] })} />
      )}
    </article>
  );
}
