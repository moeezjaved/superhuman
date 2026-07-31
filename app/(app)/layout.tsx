import { getUser } from '@/lib/auth';
import ThemeToggle from '../ThemeToggle';

const NAV = [
  { href: '/home', label: 'Home' },
  { href: '/build', label: 'Hire' },
  { href: '/chat', label: 'Ask' },
  { href: '/discover', label: 'Ideas' },
  { href: '/skills', label: 'Team' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/activity', label: 'Activity' },
  { href: '/reports', label: 'Reports' },
  { href: '/knowledge', label: 'Memory' },
  { href: '/connections', label: 'Apps' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser().catch(() => null);
  return (
    <div className="app">
      <aside className="sidebar">
        <a href="/home" className="brand"><span className="dot" /> HiUnicorn</a>
        <nav className="nav">
          {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
        </nav>
        <div className="nav-sep" style={{ marginTop: 'auto' }} />
        <nav className="nav"><a href="/settings">Settings</a></nav>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
          <ThemeToggle />
          {user ? (
            <div style={{ fontSize: 12, color: 'var(--faint)', minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--mono)', color: 'var(--graphite)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              <form action="/auth/signout" method="post"><button className="btn ghost" style={{ height: 26, padding: '0 10px', fontSize: 11, marginTop: 4 }}>Sign out</button></form>
            </div>
          ) : <a href="/login" style={{ fontSize: 13, color: 'var(--graphite)' }}>Sign in</a>}
        </div>
      </aside>
      {/* mobile top bar */}
      <div className="mobiletop">
        <a href="/home" className="brand" style={{ margin: 0 }}><span className="dot" /> HiUnicorn</a>
        <ThemeToggle />
      </div>

      <div className="main">{children}</div>

      {/* mobile bottom tabs — the pager */}
      <nav className="mobilebar" aria-label="Main">
        {[
          { href: '/home', label: 'Home' },
          { href: '/approvals', label: 'Approvals' },
          { href: '/chat', label: 'Ask' },
          { href: '/skills', label: 'Team' },
          { href: '/settings', label: 'More' },
        ].map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
      </nav>
    </div>
  );
}
