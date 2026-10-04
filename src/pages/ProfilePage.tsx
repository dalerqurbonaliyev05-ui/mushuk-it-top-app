import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { Avatar } from '../components/Avatar';
import { Icon, type IconName } from '../components/Icons';
import { fetchStats, type Stats } from '../lib/posts';
import { useI18n } from '../i18n';

export function ProfilePage({ unread, onNotifications }: { unread: number; onNotifications: () => void }) {
  const { t } = useI18n();
  const { profile, session, signOut } = useAuth();
  const nav = useNav();
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { if (session) fetchStats(session.user.id).then(setStats).catch(() => setStats(null)); }, [session]);
  if (!profile || !session) return null;
  const handle = (session.user.email ?? '').split('@')[0];

  const items: { icon: IconName; label: string; badge?: number; color: string; go: () => void }[] = [
    { icon: 'image', label: t('me.menuPosts'), color: '#16a34a', go: () => nav.push({ name: 'myPosts' }) },
    { icon: 'heart', label: t('me.menuFavs'), color: '#e11d48', go: () => nav.push({ name: 'favorites' }) },
    { icon: 'comment', label: t('me.menuComments'), color: '#2563eb', go: () => nav.push({ name: 'myComments' }) },
    { icon: 'mail', label: t('me.menuMsgs'), color: '#475569', badge: unread, go: onNotifications },
    { icon: 'settings', label: t('me.menuSettings'), color: '#475569', go: () => nav.push({ name: 'settings' }) },
    { icon: 'help', label: t('me.menuHelp'), color: '#475569', go: () => nav.push({ name: 'help' }) },
    { icon: 'logout', label: t('common.signout'), color: '#dc2626', go: () => { if (window.confirm(t('me.signoutConfirm'))) void signOut(); } },
  ];

  return (
    <div>
      <div className="me-head">
        <Avatar name={profile.full_name} url={profile.avatar_url} size={84} />
        <h2>{profile.full_name}</h2>
        {handle && <div className="muted">@{handle}</div>}
        {profile.city && <div className="muted small"><Icon name="pin" size={13} /> {profile.city}</div>}
      </div>
      <div className="stats">
        <div><b>{stats?.posts ?? '–'}</b><span>{t('me.posts')}</span></div>
        <div><b>{stats?.likes ?? '–'}</b><span>{t('me.likes')}</span></div>
        <div><b>{stats?.comments ?? '–'}</b><span>{t('me.comments')}</span></div>
      </div>
      {profile.bio && <p className="bio">{profile.bio}</p>}
      <button className="btn ghost block" onClick={() => nav.push({ name: 'settings' })}><Icon name="edit" size={17} /> {t('common.edit')}</button>
      <div className="menu">
        {items.map((it) => (
          <button key={it.label} className="menu-item" onClick={it.go}>
            <span style={{ color: it.color }}><Icon name={it.icon} /></span>
            <span className="grow" style={it.icon === 'logout' ? { color: it.color } : undefined}>{it.label}</span>
            {it.badge ? <i className="dot inline">{it.badge}</i> : null}
            <Icon name="chevron" size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}
