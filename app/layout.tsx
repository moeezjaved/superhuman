import type { Metadata } from 'next';
import './globals.css';
import { getUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Cortex — AI Operations Platform',
  description: 'Describe work in plain English. Your AI team runs it — on triggers, with approvals and full history.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser().catch(() => null);
  return (
    <html lang="en">
      <body>
        <div className="app">
          <aside className="sidebar">
            <div className="brand"><span className="dot" /> Cortex</div>
            <nav className="nav">
              <a href="/">Build a skill</a>
              <a href="/discover">Discover</a>
              <a href="/skills">Skills</a>
              <a href="/activity">Activity</a>
              <a href="/chat">Ask</a>
              <a href="/knowledge">Knowledge</a>
              <a href="/connections">Connections</a>
            </nav>
            <div style={{ marginTop: 'auto', fontSize: 12, color: 'var(--fg-3)' }}>
              {user ? (
                <div>
                  <div style={{ color: 'var(--fg-2)', marginBottom: 6, wordBreak: 'break-all' }}>{user.email}</div>
                  <form action="/auth/signout" method="post"><button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Sign out</button></form>
                </div>
              ) : <a href="/login">Sign in</a>}
            </div>
          </aside>
          {children}
        </div>
      </body>
    </html>
  );
}
