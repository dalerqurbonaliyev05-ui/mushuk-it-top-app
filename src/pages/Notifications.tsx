import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../components/Icons';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { fetchNotifications, markRead, type NotifItem } from '../lib/posts';
import { timeAgo, useI18n } from '../i18n';

type Tab = 'all' | 'like' | 'comment';

/** Tarjima ichidagi ismni qalin qilib ko'rsatadi (ism o'rni \u0000 bilan belgilanadi). */
function withName(msg: string, name: string) {
  const [a, b = ''] = msg.split('\u0000');
  return <>{a}<b>{name}</b>{b}</>;
}

export function Notifications({ onChanged }: { onChanged: () => void }) {
  const { t } = useI18n();
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
      <h2>{t('notif.title')}</h2>
      <div className="chips">
        <button className={`chip-btn all ${tab === 'all' ? 'on' : ''}`} onClick={() => setTab('all')}>{t('common.all')}</button>
        <button className={`chip-btn like ${tab === 'like' ? 'on' : ''}`} onClick={() => setTab('like')}>{t('notif.likes')}</button>
        <button className={`chip-btn comment ${tab === 'comment' ? 'on' : ''}`} onClick={() => setTab('comment')}>{t('notif.comments')}</button>
      </div>
      {err && <div className="alert err">{err}</div>}
      {items === null && !err && <div className="center muted pad"><div className="spinner" /></div>}
      {items?.length === 0 && <div className="empty">{t('notif.empty')}</div>}
      {items?.map((n) => (
        <button key={n.id} className={`notif ${n.read ? '' : 'unread'}`} onClick={() => nav.openPost(n.post_id)}>
          <span className={`n-ico ${n.type}`}><Icon name={n.type === 'like' ? 'heart' : 'comment'} size={18} fill={n.type === 'like'} /></span>
          <span className="grow">
            {withName(t(n.type === 'like' ? 'notif.like' : 'notif.comment', { name: '\u0000' }), n.actor?.full_name ?? t('common.user'))}
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
