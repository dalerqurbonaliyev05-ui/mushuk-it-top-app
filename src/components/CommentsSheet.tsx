import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { addComment, deleteComment, fetchComments, type FeedComment } from '../lib/posts';
import { timeAgo } from '../lib/format';

interface Props { postId: string; me: string; onClose: () => void; onCountChange: (delta: number) => void }

export function CommentsSheet({ postId, me, onClose, onCountChange }: Props) {
  const [items, setItems] = useState<FeedComment[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setItems(await fetchComments(postId)); setErr(null); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }, [postId]);
  useEffect(() => { void load(); }, [load]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true); setErr(null);
    try { await addComment(postId, me, text); setText(''); onCountChange(1); await load(); }
    catch (x) { setErr(x instanceof Error ? x.message : String(x)); }
    setBusy(false);
  }
  async function remove(id: string) {
    if (!window.confirm('Izohni o\'chirasizmi?')) return;
    try { await deleteComment(id); onCountChange(-1); setItems((l) => l?.filter((c) => c.id !== id) ?? null); }
    catch (x) { setErr(x instanceof Error ? x.message : String(x)); }
  }

  return (
    <Sheet title="Izohlar" onClose={onClose}>
      <div className="comments">
        {items === null && !err && <div className="muted center">Yuklanmoqda...</div>}
        {items?.length === 0 && <div className="muted center">Hali izoh yo&apos;q. Birinchi bo&apos;ling!</div>}
        {items?.map((c) => (
          <div key={c.id} className="comment">
            <Avatar name={c.author?.full_name ?? '?'} url={c.author?.avatar_url ?? null} size={32} />
            <div className="grow">
              <b>{c.author?.full_name ?? 'Foydalanuvchi'}</b> <span className="muted small">{timeAgo(c.created_at)}</span>
              <div className="ctext">{c.text}</div>
            </div>
            {c.user_id === me && <button className="link" onClick={() => void remove(c.id)}>O&apos;chirish</button>}
          </div>
        ))}
      </div>
      {err && <div className="alert err">{err}</div>}
      <form className="comment-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Izoh yozing..." />
        <button className="btn small" disabled={busy || !text.trim()}>Yuborish</button>
      </form>
    </Sheet>
  );
}
