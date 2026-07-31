'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const supabase = client();
    const { data, error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password: pw })
      : await supabase.auth.signUp({ email, password: pw });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    if (mode === 'up' && !data.session) { setMsg('Account created — check your email to confirm, then sign in.'); setMode('in'); return; }
    router.push('/home'); router.refresh();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 360, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-2)', padding: 32 }}>
        <div className="brand" style={{ marginBottom: 6 }}><span className="dot" /> HiUnicorn</div>
        <h1 style={{ margin: '10px 0 4px' }}>{mode === 'in' ? 'Welcome back' : 'Let’s get started'}</h1>
        <p className="sub" style={{ marginBottom: 20, fontSize: 14 }}>Your business, running.</p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
          <input type="password" required placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} style={inp} />
          <button className="btn" disabled={busy} style={{ marginTop: 6 }}>{busy ? '…' : (mode === 'in' ? 'Sign in' : 'Sign up')}</button>
        </form>
        {msg && <div className="warn" style={{ marginTop: 12 }}>{msg}</div>}
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--fg-2)' }}>
          {mode === 'in' ? "No account? " : 'Have an account? '}
          <a style={{ cursor: 'pointer' }} onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }}>
            {mode === 'in' ? 'Sign up' : 'Sign in'}
          </a>
        </div>
      </div>
    </div>
  );
}
const inp: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '11px 13px', fontSize: 14, fontFamily: 'inherit', outline: 'none' };
export const dynamic = 'force-dynamic';
