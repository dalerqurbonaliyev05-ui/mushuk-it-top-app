import { useCallback, useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { PostRow } from '../components/PostRow';
import { Thumb } from '../components/Thumb';
import { ProfileForm } from './ProfileForm';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { PAGE_SIZE, fetchLiked, fetchMyComments, fetchPosts, type FeedPost, type MyComment } from '../lib/posts';
import { timeAgo } from '../lib/format';
import { postTitle } from '../lib/types';

/** Sahifalangan e'lonlar ro'yxati (Mening e'lonlarim / Sevimlilarim). */
function PostList({ title, empty, load }: { title: string; empty: string; load: (me: string, from: number, size: number) => Promise<FeedPost[]> }) {
  const { session } = useAuth();
  const me = session!.user.id;
  const nav = useNav();
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchPage = useCallback(async (from: number) => {
    setBusy(true);
    try {
      const rows = await load(me, from, PAGE_SIZE);
      setPosts((p) => (from === 0 ? rows : [...(p ?? []), ...rows.filter((r) => !(p ?? []).some((x) => x.id === r.id))]));
      setMore(rows.length === PAGE_SIZE); setErr(null);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }, [me, load]);
  useEffect(() => { void fetchPage(0); }, [fetchPage]);

  return (
    <div className="screen">
      <Header title={title} onBack={nav.pop} />
      <div className="pad-x">
        {err && <div className="alert err">{err}</div>}
        {posts === null && !err && <div className="center muted pad"><div className="spinner" /></div>}
        {posts?.length === 0 && <div className="empty">{empty}</div>}
        {posts?.map((p) => <PostRow key={p.id} post={p} onOpen={nav.openPost} />)}
        {!busy && more && <button className="btn ghost block" onClick={() => void fetchPage(posts?.length ?? 0)}>Yana yuklash</button>}
      </div>
    </div>
  );
}

const loadMine = (me: string, from: number, size: number) => fetchPosts(me, { userId: me, from, size });
export const MyPosts = () => <PostList title="Mening e'lonlarim" empty="Siz hali e'lon qo'ymagansiz" load={loadMine} />;
export const Favorites = () => <PostList title="Sevimlilarim" empty="Layk bosgan e'lonlaringiz shu yerda ko'rinadi" load={fetchLiked} />;

export function MyComments() {
  const { session } = useAuth();
  const me = session!.user.id;
  const nav = useNav();
  const [items, setItems] = useState<MyComment[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fetchMyComments(me).then(setItems).catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e))); }, [me]);
  return (
    <div className="screen">
      <Header title="Izohlarim" onBack={nav.pop} />
      <div className="pad-x">
        {err && <div className="alert err">{err}</div>}
        {items === null && !err && <div className="center muted pad"><div className="spinner" /></div>}
        {items?.length === 0 && <div className="empty">Siz hali izoh yozmagansiz</div>}
        {items?.map((c) => (
          <button key={c.id} className="row-card" onClick={() => nav.openPost(c.post_id)}>
            {c.post ? <Thumb url={c.post.image_url} className="row-img sm" alt="" /> : <span className="row-img sm" />}
            <div className="row-body">
              <b className="row-title">{c.post ? postTitle(c.post) : 'O\'chirilgan e\'lon'}</b>
              <div className="ctext">{c.text}</div>
              <div className="muted small">{timeAgo(c.created_at)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Settings() {
  const { profile, refreshProfile } = useAuth();
  const nav = useNav();
  if (!profile) return null;
  return (
    <div className="screen">
      <Header title="Sozlamalar" onBack={nav.pop} />
      <div className="pad-x"><ProfileForm profile={profile} onDone={() => { void refreshProfile(); nav.pop(); }} onCancel={nav.pop} /></div>
    </div>
  );
}

export function Help() {
  const nav = useNav();
  return (
    <div className="screen">
      <Header title="Yordam va qo'llab-quvvatlash" onBack={nav.pop} />
      <div className="pad-x help">
        <h3>Qanday e&apos;lon qo&apos;yiladi?</h3>
        <p>Pastdagi yashil «+» tugmasini bosing, «Mushuk» yoki «It»ni tanlang va suratga oling. Rasm olingan joyning GPS joylashuvi avtomatik saqlanadi. Sarlavha va izoh yozib, «E&apos;lon qilish»ni bosing.</p>
        <h3>Joylashuv aniqlanmasa nima qilish kerak?</h3>
        <p>Telefonda GPS (joylashuv) yoqilganini va ilovaga joylashuv ruxsati berilganini tekshiring: Sozlamalar → Ilovalar → Mushuk va Itlarni Top → Ruxsatlar. Ochiq joyda qayta urinib ko&apos;ring.</p>
        <h3>Nomaqbul e&apos;lon yoki spam</h3>
        <p>Qoidabuzar e&apos;lon yoki izohni administrator o&apos;chiradi yoki foydalanuvchini bloklaydi. Shikoyat uchun e&apos;lon sarlavhasi va muallifini yozib administratorga murojaat qiling.</p>
        <h3>Mening e&apos;lonimni qanday o&apos;chiraman?</h3>
        <p>E&apos;lonni oching va yuqori o&apos;ngdagi axlat qutisi belgisini bosing.</p>
      </div>
    </div>
  );
}
