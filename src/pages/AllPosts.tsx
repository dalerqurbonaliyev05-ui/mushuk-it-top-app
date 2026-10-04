import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Header } from '../components/Header';
import { TypeChips } from '../components/Chips';
import { PostCard } from '../components/PostCard';
import { Icon } from '../components/Icons';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { PAGE_SIZE, fetchPosts, type FeedPost } from '../lib/posts';
import { ANIMAL, type AnimalType } from '../lib/types';

/** Barcha e'lonlar lentasi (to'liq kartalar: layk, izoh, lokatsiya) — tur va qidiruv bo'yicha filtr. */
export function AllPosts({ type: t0 = null, q: q0 = '' }: { type?: AnimalType | null; q?: string }) {
  const { session } = useAuth();
  const me = session!.user.id;
  const nav = useNav();
  const [type, setType] = useState<AnimalType | null>(t0);
  const [q, setQ] = useState(q0);
  const [query, setQuery] = useState(q0);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async (reset: boolean, from: number) => {
    const my = ++seq.current;
    setLoading(true); setErr(null);
    try {
      const rows = await fetchPosts(me, { from, size: PAGE_SIZE, type, q: query });
      if (my !== seq.current) return;
      setPosts((p) => (reset ? rows : [...p, ...rows.filter((r) => !p.some((x) => x.id === r.id))]));
      setMore(rows.length === PAGE_SIZE);
    } catch (e) { if (my === seq.current) setErr(e instanceof Error ? e.message : String(e)); }
    if (my === seq.current) setLoading(false);
  }, [me, type, query]);

  useEffect(() => { void load(true, 0); }, [load]);

  const title = type ? ANIMAL[type].plural : 'Barcha e\'lonlar';
  return (
    <div className="screen">
      <Header title={title} onBack={nav.pop} />
      <div className="pad-x">
        <form className="search" onSubmit={(e: FormEvent) => { e.preventDefault(); setQuery(q.trim()); }}>
          <Icon name="search" size={19} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sarlavha, izoh yoki manzil bo'yicha" aria-label="Qidirish" />
        </form>
        <TypeChips value={type} onChange={setType} />
        {err && <div className="alert err">{err} <button className="link" onClick={() => void load(true, 0)}>Qayta urinish</button></div>}
        {!loading && !err && posts.length === 0 && <div className="empty">E&apos;lon topilmadi</div>}
        {posts.map((p) => (
          <PostCard key={p.id} post={p} me={me} onOpen={nav.openPost}
            onChange={(np) => setPosts((l) => l.map((x) => (x.id === np.id ? np : x)))}
            onDeleted={(id) => setPosts((l) => l.filter((x) => x.id !== id))} />
        ))}
        {loading && <div className="center muted pad"><div className="spinner" /></div>}
        {!loading && more && <button className="btn ghost block" onClick={() => void load(false, posts.length)}>Yana yuklash</button>}
      </div>
    </div>
  );
}
