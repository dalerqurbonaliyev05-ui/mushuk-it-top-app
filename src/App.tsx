import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { isConfigured } from './lib/config';
import { isNative } from './lib/supabase';
import { useAuth } from './lib/auth';
import { LocationProvider } from './lib/location';
import { NavProvider, useNav, type Screen } from './lib/nav';
import { unreadCount } from './lib/posts';
import { Icon } from './components/Icons';
import { Login } from './pages/Login';
import { ProfileForm } from './pages/ProfileForm';
import { Home } from './pages/Home';
import { MapPage } from './pages/MapPage';
import { NewPostPage } from './pages/NewPost';
import { Notifications } from './pages/Notifications';
import { ProfilePage } from './pages/ProfilePage';
import { AllPosts } from './pages/AllPosts';
import { PostDetail } from './pages/PostDetail';
import { Favorites, Help, MyComments, MyPosts, Settings } from './pages/Lists';
import { useI18n } from './i18n';

type Tab = 'home' | 'map' | 'new' | 'notifs' | 'me';

function ScreenView({ s }: { s: Screen }) {
  switch (s.name) {
    case 'post': return <PostDetail key={s.id} id={s.id} />;
    case 'all': return <AllPosts type={s.type} q={s.q} />;
    case 'myPosts': return <MyPosts />;
    case 'favorites': return <Favorites />;
    case 'myComments': return <MyComments />;
    case 'settings': return <Settings />;
    case 'help': return <Help />;
  }
}

function Shell({ userId }: { userId: string }) {
  const { t } = useI18n();
  const nav = useNav();
  const [tab, setTab] = useState<Tab>('home');
  const [unread, setUnread] = useState(0);
  const [epoch, setEpoch] = useState(0);   // tafsilotlardan qaytganda asosiy sahifalarni yangilash
  const depth = nav.stack.length;
  const prevDepth = useRef(0);

  const refreshUnread = useCallback(() => { unreadCount(userId).then(setUnread).catch(() => undefined); }, [userId]);
  useEffect(() => { refreshUnread(); const t = setInterval(refreshUnread, 60000); return () => clearInterval(t); }, [refreshUnread]);
  useEffect(() => {
    const h = CapApp.addListener('appStateChange', ({ isActive }) => { if (isActive) refreshUnread(); });
    return () => { void h.then((x) => x.remove()); };
  }, [refreshUnread]);

  useEffect(() => {
    if (prevDepth.current > 0 && depth === 0) setEpoch((e) => e + 1);
    prevDepth.current = depth;
  }, [depth]);

  // Android "orqaga": avval ochiq sahifa, so'ng bosh tab, so'ng chiqish.
  const back = useRef<() => void>(() => undefined);
  back.current = () => {
    if (depth > 0) nav.pop();
    else if (tab !== 'home') setTab('home');
    else void CapApp.exitApp();
  };
  useEffect(() => {
    if (!isNative) return;
    const h = CapApp.addListener('backButton', () => back.current());
    return () => { void h.then((x) => x.remove()); };
  }, []);
  // Brauzer/veb-ilova: telefonning "orqaga" tugmasi yoki brauzer orqaga strelkasi ham avval ochiq sahifani yopadi.
  const canBack = useRef(false);
  canBack.current = depth > 0 || tab !== 'home';
  useEffect(() => {
    if (isNative) return;
    window.history.pushState({ mu: 1 }, '');
    const onPop = () => {
      if (!canBack.current) { window.history.back(); return; }
      back.current();
      window.history.pushState({ mu: 1 }, '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const top = nav.stack[depth - 1];
  return (
    <div className="app">
      <main className={`page ${depth > 0 ? 'hide' : ''} ${tab === 'map' ? 'flush' : ''}`} key={epoch}>
        {tab === 'home' && <Home unread={unread} onCamera={() => setTab('new')} onBell={() => setTab('notifs')} />}
        {tab === 'map' && <MapPage />}
        {tab === 'new' && <NewPostPage onPosted={() => { nav.reset(); setEpoch((e) => e + 1); setTab('home'); }} />}
        {tab === 'notifs' && <Notifications onChanged={refreshUnread} />}
        {tab === 'me' && <ProfilePage unread={unread} onNotifications={() => setTab('notifs')} />}
      </main>
      {top && <div className="overlay"><ScreenView s={top} key={depth} /></div>}
      {depth === 0 && (
        <nav className="tabbar">
          <button className={tab === 'home' ? 'on' : ''} onClick={() => setTab('home')}><Icon name="home" /><span>{t('tab.home')}</span></button>
          <button className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}><Icon name="map" /><span>{t('tab.map')}</span></button>
          <button className={`add ${tab === 'new' ? 'on' : ''}`} onClick={() => setTab('new')} aria-label={t('tab.new')}><i><Icon name="plus" size={28} /></i></button>
          <button className={tab === 'notifs' ? 'on' : ''} onClick={() => setTab('notifs')}><span className="ico-wrap"><Icon name="bell" />{unread > 0 && <i className="dot">{unread > 9 ? '9+' : unread}</i>}</span><span>{t('tab.notifs')}</span></button>
          <button className={tab === 'me' ? 'on' : ''} onClick={() => setTab('me')}><Icon name="user" /><span>{t('tab.me')}</span></button>
        </nav>
      )}
    </div>
  );
}

export function App() {
  const { t } = useI18n();
  const { session, profile, loading, error, signOut, refreshProfile } = useAuth();

  if (!isConfigured) {
    return (
      <div className="center-screen">
        <h2>{t('cfg.title')}</h2>
        <p className="muted">{t('cfg.body')}</p>
      </div>
    );
  }
  if (loading) return <div className="center-screen"><div className="spinner" />{t('common.loading')}</div>;
  if (!session) return <Login />;
  if (!profile) {
    return (
      <div className="center-screen">
        <p>{error ? t('profile.loadFail', { err: error }) : t('profile.notFound')}</p>
        <button className="btn" onClick={() => void refreshProfile()}>{t('common.retry')}</button>
        <button className="btn ghost" onClick={() => void signOut()}>{t('common.signout')}</button>
      </div>
    );
  }
  if (profile.blocked) {
    return (
      <div className="center-screen">
        <div className="big">🚫</div>
        <h2>{t('blocked.title')}</h2>
        <p className="muted">{t('blocked.text')}</p>
        <button className="btn ghost" onClick={() => void signOut()}>{t('common.signout')}</button>
      </div>
    );
  }
  if (!profile.onboarded) return <ProfileForm profile={profile} firstTime onDone={() => void refreshProfile()} />;

  return (
    <LocationProvider>
      <NavProvider>
        <Shell userId={session.user.id} />
      </NavProvider>
    </LocationProvider>
  );
}
