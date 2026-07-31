import type { Metadata } from 'next';
import './globals.css';
import { getUser } from '@/lib/auth';
import ThemeToggle from './ThemeToggle';

export const metadata: Metadata = {
  title: 'HiUnicorn — your business, running',
  description: 'HiUnicorn learns how your company works, then does the repetitive work for you — and asks before anything that matters.',
};

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/build', label: 'Hire' },
  { href: '/chat', label: 'Ask' },
  { href: '/discover', label: 'Ideas' },
  { href: '/skills', label: 'Team' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/activity', label: 'Activity' },
  { href: '/knowledge', label: 'Memory' },
  { href: '/connections', label: 'Apps' },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser().catch(() => null);
  return (
    <html lang="en">
      <body>
        <div className="app">
          <aside className="sidebar">
            <div className="brand"><span className="dot" /> HiUnicorn</div>
            <nav className="nav">
              {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
            </nav>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
              <ThemeToggle />
              {user ? (
                <div style={{ fontSize: 12, color: 'var(--faint)', minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', color: 'var(--graphite)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                  <form action="/auth/signout" method="post"><button className="btn ghost" style={{ height: 26, padding: '0 10px', fontSize: 11, marginTop: 4 }}>Sign out</button></form>
                </div>
              ) : <a href="/login" style={{ fontSize: 13, color: 'var(--graphite)' }}>Sign in</a>}
            </div>
          </aside>
          <div className="main">{children}</div>
        </div>
      </body>
    </html>
  );
}
