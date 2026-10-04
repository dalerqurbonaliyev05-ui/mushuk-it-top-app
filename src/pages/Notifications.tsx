import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../components/Icons';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { fetchNotifications, markRead, type NotifItem } from '../lib/posts';
import { timeAgo } from '../lib/format';

type Tab = 'all' | 'like' | 'comment';

export function Notifications({ onChanged }: { onChanged: () => void }) {
  const { session } = useAuth();
  const me = session!.user.id;
  const nav = useNav();
  const [tab, setTab] = useState<Tab>('all');
  const [items, setItems] = useState<NotifItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await fetchNotifications(me, tab === 'all' ? undefined : tab);
      setItems(rows); setErr(null);
      const unread = rows.filter((r) => !r.read).map((r) => r.id);
      if (unread.length) { await markRead(unread); onChanged(); }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }, [me, tab, onChanged]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <h2>Bildirishnomalar</h2>
      <div className="chips">
        <button className={`chip-btn all ${tab === 'all' ? 'on' : ''}`} onClick={() => setTab('all')}>Barchasi</button>
        <button className={`chip-btn like ${tab === 'like' ? 'on' : ''}`} onClick={() => setTab('like')}>Layklar</button>
        <button className={`chip-btn comment ${tab === 'comment' ? 'on' : ''}`} onClick={() => setTab('comment')}>Izohlar</button>
      </div>
      {err && <div className="alert err">{err}</div>}
      {items === null && !err && <div className="center muted pad"><div className="spinner" /></div>}
      {items?.length === 0 && <div className="empty">Hali bildirishnomalar yo&apos;q</div>}
      {items?.map((n) => (
        <button key={n.id} className={`notif ${n.read ? '' : 'unread'}`} onClick={() => nav.openPost(n.post_id)}>
          <span className={`n-ico ${n.type}`}><Icon name={n.type === 'like' ? 'heart' : 'comment'} size={18} fill={n.type === 'like'} /></span>
          <span className="grow">
            <b>{n.actor?.full_name ?? 'Foydalanuvchi'}</b>{' '}
            {n.type === 'like' ? 'e\'loningizga layk bosdi' : 'e\'loningizga izoh qoldirdi'}
            {n.post?.title ? <> «{n.post.title}»</> : null}
            {n.type === 'comment' && n.body ? <div className="n-body">“{n.body}”</div> : null}
            <div className="muted small">{timeAgo(n.created_at)}</div>
          </span>
          <Avatar name={n.actor?.full_name ?? '?'} url={n.actor?.avatar_url ?? null} size={34} />
        </button>
      ))}
    </div>
  );
}
