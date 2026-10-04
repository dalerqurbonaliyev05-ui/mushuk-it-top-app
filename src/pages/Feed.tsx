import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { PAGE_SIZE, fetchFeed, type FeedPost } from '../lib/posts';
import { PostCard } from '../components/PostCard';

interface Props { userId?: string; emptyText?: string }

/** Yangilanish lentasi (barcha foydalanuvchilar postlari) yoki bitta foydalanuvchining postlari. */
export function Feed({ userId, emptyText = 'Hali e\'lonlar yo\'q. Birinchi bo\'lib suratga oling!' }: Props) {
  const { session } = useAuth();
  const me = session!.user.id;
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async (reset: boolean, from: number) => {
    const my = ++seq.current;
    setLoading(true); setErr(null);
    try {
      const rows = await fetchFeed(me, from, PAGE_SIZE, userId);
      if (my !== seq.current) return;   // eskirgan javob
      setPosts((p) => (reset ? rows : [...p, ...rows.filter((r) => !p.some((x) => x.id === r.id))]));
      setMore(rows.length === PAGE_SIZE);
    } catch (e) { if (my === seq.current) setErr(e instanceof Error ? e.message : String(e)); }
    if (my === seq.current) setLoading(false);
  }, [me, userId]);

  useEffect(() => { void load(true, 0); }, [load]);

  return (
    <div>
      {!userId && <div className="topline"><h2>Lenta</h2><button className="btn small ghost" onClick={() => void load(true, 0)} disabled={loading}>↻ Yangilash</button></div>}
      {err && <div className="alert err">{err} <button className="link" onClick={() => void load(true, 0)}>Qayta urinish</button></div>}
      {!loading && !err && posts.length === 0 && <div className="empty">{emptyText}</div>}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} me={me}
          onChange={(np) => setPosts((l) => l.map((x) => (x.id === np.id ? np : x)))}
          onDeleted={(id) => setPosts((l) => l.filter((x) => x.id !== id))} />
      ))}
      {loading && <div className="center muted pad"><div className="spinner" /></div>}
      {!loading && more && <button className="btn ghost block" onClick={() => void load(false, posts.length)}>Yana yuklash</button>}
    </div>
  );
}
