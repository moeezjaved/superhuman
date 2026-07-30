import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cortex — AI Operations Platform',
  description: 'Describe work in plain English. Your AI team runs it — on triggers, with approvals and full history.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <aside className="sidebar">
            <div className="brand"><span className="dot" /> Cortex</div>
            <nav className="nav">
              <a href="/">Build a skill</a>
              <a href="/chat">Ask</a>
              <a href="/discover">Discover</a>
              <a href="/skills">Skills</a>
              <a href="/activity">Activity</a>
              <a href="/skills">Approvals</a>
              <a href="/knowledge">Knowledge</a>
              <a href="/">Connections</a>
            </nav>
            <div style={{ marginTop: 'auto', fontSize: 12, color: 'var(--fg-3)' }}>
              v0.0.1 · compiler · run engine · grounded chat
            </div>
          </aside>
          {children}
        </div>
      </body>
    </html>
  );
}
