import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Header } from '../components/Header';
import { Icon } from '../components/Icons';
import { Avatar } from '../components/Avatar';
import { TypeBadge } from '../components/Chips';
import { MiniMap } from '../components/MiniMap';
import { useAuth } from '../lib/auth';
import { useMyLocation } from '../lib/location';
import { useNav } from '../lib/nav';
import { addComment, deleteComment, deletePost, fetchComments, fetchPost, setLike, type FeedComment, type FeedPost } from '../lib/posts';
import { fmtCoords, mapsUrl } from '../lib/geo';
import { timeAgo } from '../lib/format';
import { openExternal } from '../lib/open';
import { postTitle } from '../lib/types';

export function PostDetail({ id }: { id: string }) {
  const { session, profile } = useAuth();
  const me = session!.user.id;
  const nav = useNav();
  const { distanceTo } = useMyLocation();
  const [post, setPost] = useState<FeedPost | null | undefined>(undefined);   // undefined: yuklanmoqda, null: topilmadi
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try { setComments(await fetchComments(id)); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }, [id]);

  useEffect(() => {
    let alive = true;
    fetchPost(me, id).then((p) => { if (alive) setPost(p); }).catch((e: unknown) => { if (alive) { setPost(null); setErr(e instanceof Error ? e.message : String(e)); } });
    void loadComments();
    return () => { alive = false; };
  }, [me, id, loadComments]);

  if (post === undefined) return <div className="screen"><Header title="E'lon tafsilotlari" onBack={nav.pop} /><div className="center muted pad"><div className="spinner" /></div></div>;
  if (post === null) return <div className="screen"><Header title="E'lon tafsilotlari" onBack={nav.pop} /><div className="empty m">{err ?? 'E\'lon topilmadi yoki o\'chirilgan'}</div></div>;

  const likes = post.likes[0]?.count ?? 0;
  const dist = distanceTo(post.latitude, post.longitude);
  const mine = post.user_id === me;

  async function toggleLike() {
    if (!post || busy) return;
    const on = !post.liked, prev = post;
    setBusy(true);
    setPost({ ...post, liked: on, likes: [{ count: Math.max(0, likes + (on ? 1 : -1)) }] });
    try { await setLike(post.id, me, on); } catch { setPost(prev); }
    setBusy(false);
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!post || !text.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      await addComment(post.id, me, text);
      setText('');
      setPost({ ...post, comments: [{ count: (post.comments[0]?.count ?? 0) + 1 }] });
      await loadComments();
    } catch (x) { setErr(x instanceof Error ? x.message : String(x)); }
    setBusy(false);
  }
  async function removeComment(cid: string) {
    if (!post || !window.confirm('Izohni o\'chirasizmi?')) return;
    try {
      await deleteComment(cid);
      setComments((l) => l.filter((c) => c.id !== cid));
      setPost({ ...post, comments: [{ count: Math.max(0, (post.comments[0]?.count ?? 1) - 1) }] });
    } catch (x) { setErr(x instanceof Error ? x.message : String(x)); }
  }
  async function removePost() {
    if (!post || !window.confirm('E\'loningizni o\'chirasizmi?')) return;
    try { await deletePost(post); nav.pop(); } catch (x) { setErr(x instanceof Error ? x.message : String(x)); }
  }

  return (
    <div className="screen with-bar">
      <Header title="E'lon tafsilotlari" onBack={nav.pop}
        right={mine ? <button className="icon-btn danger" onClick={() => void removePost()} aria-label="E'lonni o'chirish"><Icon name="trash" size={20} /></button> : undefined} />
      <img className="detail-img" src={post.image_url} alt={postTitle(post)} />
      {post.status === 'blocked' && <div className="alert err tight">Bu e&apos;lon administrator tomonidan bloklangan, boshqalarga ko&apos;rinmaydi.</div>}
      <div className="detail">
        <div className="d-title">
          <h3>{postTitle(post)}</h3>
          <TypeBadge type={post.animal_type} />
          <span className="likes big"><Icon name="heart" size={17} fill /> {likes}</span>
        </div>
        <div className="author"><Avatar name={post.author?.full_name ?? '?'} url={post.author?.avatar_url ?? null} size={30} /><span><b>{post.author?.full_name ?? 'Foydalanuvchi'}</b></span></div>
        {post.caption && <p className="caption lg">{post.caption}</p>}
        <div className="info-list">
          <button className="info" onClick={() => void openExternal(mapsUrl(post.latitude, post.longitude))}>
            <Icon name="pin" /><span><small>Joylashuv</small><b>{post.address ?? 'Manzil aniqlanmagan'}</b><small>{fmtCoords(post.latitude, post.longitude)}</small></span><Icon name="chevron" size={16} />
          </button>
          <div className="info"><Icon name="ruler" /><span><small>Masofa</small><b>{dist ?? 'Joylashuvingiz noma\'lum'}</b></span></div>
          <div className="info"><Icon name="clock" /><span><small>Joylashtirilgan vaqti</small><b>{timeAgo(post.created_at)}</b></span></div>
        </div>
        <div className="mapbox">
          <MiniMap lat={post.latitude} lng={post.longitude} />
          <button className="btn ok block" onClick={() => void openExternal(mapsUrl(post.latitude, post.longitude))}><Icon name="external" size={17} /> Google Maps&apos;da ochish</button>
        </div>
        <div className="two">
          <button className={`btn-soft like ${post.liked ? 'on' : ''}`} onClick={() => void toggleLike()} aria-pressed={post.liked}><Icon name="heart" size={19} fill={post.liked} /> Layk ({likes})</button>
          <a className="btn-soft comment" href="#comments"><Icon name="comment" size={19} /> Izoh ({post.comments[0]?.count ?? 0})</a>
        </div>
        <h4 id="comments" className="sec-title">Izohlar</h4>
        {err && <div className="alert err">{err}</div>}
        {comments.length === 0 && <div className="muted small">Hali izoh yo&apos;q. Birinchi bo&apos;ling!</div>}
        {comments.map((c) => (
          <div key={c.id} className="comment">
            <Avatar name={c.author?.full_name ?? '?'} url={c.author?.avatar_url ?? null} size={32} />
            <div className="grow">
              <b>{c.author?.full_name ?? 'Foydalanuvchi'}</b> <span className="muted small">{timeAgo(c.created_at)}</span>
              <div className="ctext">{c.text}</div>
            </div>
            {c.user_id === me && <button className="link bad" onClick={() => void removeComment(c.id)}>O&apos;chirish</button>}
          </div>
        ))}
      </div>
      <form className="comment-bar" onSubmit={send}>
        <Avatar name={profile?.full_name ?? '?'} url={profile?.avatar_url ?? null} size={34} />
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Izoh yozing..." aria-label="Izoh" />
        <button className="send" disabled={busy || !text.trim()} aria-label="Yuborish"><Icon name="send" size={19} /></button>
      </form>
    </div>
  );
}
