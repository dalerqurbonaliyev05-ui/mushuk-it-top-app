import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '../components/Icons';
import { PostRow } from '../components/PostRow';
import logo from '../assets/logo.svg';
import { useAuth } from '../lib/auth';
import { useMyLocation } from '../lib/location';
import { useNav } from '../lib/nav';
import { fetchNearby, type FeedPost } from '../lib/posts';
import { ANIMAL, animalLabel } from '../lib/types';
import { useI18n } from '../i18n';

export function Home({ unread, onCamera, onBell }: { unread: number; onCamera: () => void; onBell: () => void }) {
  const { t } = useI18n();
  const { session } = useAuth();
  const me = session!.user.id;
  const { fix, status } = useMyLocation();
  const nav = useNav();
  const [q, setQ] = useState('');
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const lat = fix?.lat, lng = fix?.lng;

  useEffect(() => {
    let alive = true;
    fetchNearby(me, fix, { limit: 10 })
      .then((r) => { if (alive) { setPosts(r); setErr(null); } })
      .catch((e: unknown) => { if (alive) setErr(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, [me, lat, lng]);

  function search(e: FormEvent) {
    e.preventDefault();
    nav.push({ name: 'all', q: q.trim() });
  }

  return (
    <div>
      <div className="home-top">
        <img src={logo} alt="" className="logo-sm" />
        <h1>{t('app.line1')}<br />{t('app.line2')}</h1>
        <button className="icon-btn bell" onClick={onBell} aria-label={t('home.bell')}><Icon name="bell" />{unread > 0 && <i className="dot">{unread > 9 ? '9+' : unread}</i>}</button>
      </div>
      <form className="search" onSubmit={search}>
        <Icon name="search" size={19} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.search')} aria-label={t('home.searchAria')} />
      </form>
      <div className="tiles">
        <button className="tile cat" onClick={() => nav.push({ name: 'all', type: 'cat' })}><span className="emo">{ANIMAL.cat.icon}</span>{animalLabel('cat')}</button>
        <button className="tile dog" onClick={() => nav.push({ name: 'all', type: 'dog' })}><span className="emo">{ANIMAL.dog.icon}</span>{animalLabel('dog')}</button>
      </div>
      <button className="cam-card" onClick={onCamera}>
        <span className="cam-ico"><Icon name="camera" size={30} /></span>
        <span><b>{t('home.camTitle')}</b><small>{t('home.camSub')}</small></span>
      </button>
      <div className="sec-head">
        <h3>{t('home.nearby')}</h3>
        <button className="link" onClick={() => nav.push({ name: 'all' })}>{t('common.all')} <Icon name="chevron" size={13} /></button>
      </div>
      {status === 'error' && <div className="hint">{t('home.noLoc')}</div>}
      {err && <div className="alert err">{err}</div>}
      {posts === null && !err && <div className="center muted pad"><div className="spinner" /></div>}
      {posts?.length === 0 && <div className="empty">{t('home.empty')}</div>}
      {posts?.map((p) => <PostRow key={p.id} post={p} onOpen={nav.openPost} />)}
    </div>
  );
}
