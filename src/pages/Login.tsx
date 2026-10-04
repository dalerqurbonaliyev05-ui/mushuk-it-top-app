import { useState } from 'react';
import { useAuth } from '../lib/auth';

export function Login() {
  const { signInWithGoogle, error } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <div className="center-screen login">
      <div className="logo">🐾</div>
      <h1>Mushuk va It Top</h1>
      <p className="muted">Ko&apos;chada uchragan mushuk va itlarni suratga oling, joylashuvi bilan e&apos;lon qiling. Egasi topilsin!</p>
      {error && <div className="alert err">{error}</div>}
      <button className="btn google" disabled={busy} onClick={async () => { setBusy(true); try { await signInWithGoogle(); } finally { setBusy(false); } }}>
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.5-4.1 7-10.2 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
        Google orqali kirish
      </button>
    </div>
  );
}
