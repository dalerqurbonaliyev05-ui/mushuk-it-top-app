import { useCallback, useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { PostRow } from '../components/PostRow';
import { Thumb } from '../components/Thumb';
import { ProfileForm } from './ProfileForm';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { PAGE_SIZE, fetchLiked, fetchMyComments, fetchPosts, type FeedPost, type MyComment } from '../lib/posts';
import { postTitle } from '../lib/types';
import { timeAgo, useI18n, LANGS } from '../i18n';
import { useTheme, type ThemePref } from '../lib/theme';

/** Sahifalangan e'lonlar ro'yxati (Mening e'lonlarim / Sevimlilarim). */
function PostList({ title, empty, load }: { title: string; empty: string; load: (me: string, from: number, size: number) => Promise<FeedPost[]> }) {
  const { t } = useI18n();
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
        {!busy && more && <button className="btn ghost block" onClick={() => void fetchPage(posts?.length ?? 0)}>{t('common.more')}</button>}
      </div>
    </div>
  );
}

const loadMine = (me: string, from: number, size: number) => fetchPosts(me, { userId: me, from, size });
export function MyPosts() { const { t } = useI18n(); return <PostList title={t('me.menuPosts')} empty={t('list.myPostsEmpty')} load={loadMine} />; }
export function Favorites() { const { t } = useI18n(); return <PostList title={t('me.menuFavs')} empty={t('list.favsEmpty')} load={fetchLiked} />; }

export function MyComments() {
  const { t } = useI18n();
  const { session } = useAuth();
  const me = session!.user.id;
  const nav = useNav();
  const [items, setItems] = useState<MyComment[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fetchMyComments(me).then(setItems).catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e))); }, [me]);
  return (
    <div className="screen">
      <Header title={t('me.menuComments')} onBack={nav.pop} />
      <div className="pad-x">
        {err && <div className="alert err">{err}</div>}
        {items === null && !err && <div className="center muted pad"><div className="spinner" /></div>}
        {items?.length === 0 && <div className="empty">{t('list.commentsEmpty')}</div>}
        {items?.map((c) => (
          <button key={c.id} className="row-card" onClick={() => nav.openPost(c.post_id)}>
            {c.post ? <Thumb url={c.post.image_url} className="row-img sm" alt="" /> : <span className="row-img sm" />}
            <div className="row-body">
              <b className="row-title">{c.post ? postTitle(c.post) : t('list.deletedPost')}</b>
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
  const { t, lang, setLang } = useI18n();
  const { pref, setPref } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const nav = useNav();
  if (!profile) return null;
  const themes: { v: ThemePref; label: string }[] = [
    { v: 'system', label: t('settings.themeSystem') }, { v: 'light', label: t('settings.themeLight') }, { v: 'dark', label: t('settings.themeDark') },
  ];
  return (
    <div className="screen">
      <Header title={t('settings.title')} onBack={nav.pop} />
      <div className="pad-x">
        <h4 className="set-title">{t('settings.language')}</h4>
        <div className="lang-seg" role="group" aria-label={t('settings.language')}>
          {LANGS.map((l) => <button key={l.code} className={lang === l.code ? 'on' : ''} onClick={() => setLang(l.code)}>{l.label}</button>)}
        </div>
        <h4 className="set-title">{t('settings.theme')}</h4>
        <div className="lang-seg" role="group" aria-label={t('settings.theme')}>
          {themes.map((x) => <button key={x.v} className={pref === x.v ? 'on' : ''} onClick={() => setPref(x.v)}>{x.label}</button>)}
        </div>
        <h4 className="set-title">{t('settings.profile')}</h4>
        <ProfileForm profile={profile} onDone={() => { void refreshProfile(); nav.pop(); }} onCancel={nav.pop} />
      </div>
    </div>
  );
}

export function Help() {
  const { t } = useI18n();
  const nav = useNav();
  return (
    <div className="screen">
      <Header title={t('help.title')} onBack={nav.pop} />
      <div className="pad-x help">
        {([1, 2, 3, 4] as const).map((i) => (
          <div key={i}><h3>{t(`help.q${i}`)}</h3><p>{t(`help.a${i}`)}</p></div>
        ))}
      </div>
    </div>
  );
}
