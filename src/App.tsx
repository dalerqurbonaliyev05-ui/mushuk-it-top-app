import { useState } from 'react';
import { isConfigured } from './lib/config';
import { useAuth } from './lib/auth';
import { Login } from './pages/Login';
import { ProfileForm } from './pages/ProfileForm';
import { Feed } from './pages/Feed';
import { NewPostPage } from './pages/NewPost';
import { ProfilePage } from './pages/ProfilePage';

type Tab = 'feed' | 'new' | 'me';

export function App() {
  const { session, profile, loading, error, signOut, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('feed');
  const [feedKey, setFeedKey] = useState(0);   // yangi post yuborilgach lentani qayta yuklash uchun

  if (!isConfigured) {
    return (
      <div className="center-screen">
        <h2>Supabase sozlanmagan</h2>
        <p className="muted">Build vaqtida <code>VITE_SUPABASE_URL</code> va <code>VITE_SUPABASE_ANON_KEY</code> berilmagan. README&apos;dagi «Sozlash» bo&apos;limiga qarang.</p>
      </div>
    );
  }
  if (loading) return <div className="center-screen"><div className="spinner" />Yuklanmoqda...</div>;
  if (!session) return <Login />;
  if (!profile) {
    return (
      <div className="center-screen">
        <p>{error ? `Profilni yuklab bo'lmadi: ${error}` : 'Profil topilmadi.'}</p>
        <button className="btn" onClick={() => void refreshProfile()}>Qayta urinish</button>
        <button className="btn ghost" onClick={() => void signOut()}>Chiqish</button>
      </div>
    );
  }
  if (profile.blocked) {
    return (
      <div className="center-screen">
        <div className="big">🚫</div>
        <h2>Hisobingiz bloklangan</h2>
        <p className="muted">Qoidalar buzilgani uchun administrator hisobingizni bloklagan.</p>
        <button className="btn ghost" onClick={() => void signOut()}>Chiqish</button>
      </div>
    );
  }
  if (!profile.onboarded) return <ProfileForm profile={profile} firstTime onDone={() => void refreshProfile()} />;

  return (
    <div className="app">
      <main className="page">
        {tab === 'feed' && <Feed key={feedKey} />}
        {tab === 'new' && <NewPostPage onPosted={() => { setFeedKey((k) => k + 1); setTab('feed'); }} />}
        {tab === 'me' && <ProfilePage />}
      </main>
      <nav className="tabbar">
        <button className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}><span>🏠</span>Lenta</button>
        <button className={`add ${tab === 'new' ? 'on' : ''}`} onClick={() => setTab('new')}><span>📷</span>E&apos;lon</button>
        <button className={tab === 'me' ? 'on' : ''} onClick={() => setTab('me')}><span>👤</span>Profil</button>
      </nav>
    </div>
  );
}
