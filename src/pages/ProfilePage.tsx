import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import { Feed } from './Feed';
import { ProfileForm } from './ProfileForm';

export function ProfilePage() {
  const { profile, session, signOut, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  if (!profile || !session) return null;
  if (editing) return <ProfileForm profile={profile} onDone={() => { void refreshProfile(); setEditing(false); }} onCancel={() => setEditing(false)} />;
  return (
    <div>
      <div className="me-head">
        <Avatar name={profile.full_name} url={profile.avatar_url} size={72} />
        <h2>{profile.full_name}</h2>
        <div className="muted">{session.user.email}</div>
        {(profile.city || profile.phone) && <div className="muted">{[profile.city, profile.phone].filter(Boolean).join(' · ')}</div>}
        {profile.bio && <p>{profile.bio}</p>}
        <div className="row">
          <button className="btn small" onClick={() => setEditing(true)}>Tahrirlash</button>
          <button className="btn small ghost" onClick={() => { if (window.confirm('Chiqishni xohlaysizmi?')) void signOut(); }}>Chiqish</button>
        </div>
      </div>
      <h3 className="section">Mening e&apos;lonlarim</h3>
      <Feed userId={profile.user_id} emptyText="Siz hali e'lon qo'ymagansiz" />
    </div>
  );
}
