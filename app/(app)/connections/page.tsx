'use client';
import { useEffect, useState } from 'react';
import Nango from '@nangohq/frontend';

const CONNECTORS = [
  { id: 'google-mail', label: 'Gmail', emoji: '✉️' },
  { id: 'google-drive', label: 'Google Drive', emoji: '📁' },
  { id: 'dropbox', label: 'Dropbox', emoji: '🗂️' },
  { id: 'slack', label: 'Slack', emoji: '💬' },
  { id: 'notion', label: 'Notion', emoji: '📝' },
];

const INGESTABLE = new Set(['slack', 'notion']);

export default function ConnectionsPage() {
  const [connected, setConnected] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function ingest(id: string, label: string) {
    setIngesting(id); setMsg('Reading your ' + label + '… this can take a moment.');
    try {
      const r = await (await fetch('/api/ingest', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: id }),
      })).json();
      if (r.error) throw new Error(r.error);
      setMsg(`Learned from ${label}: ${r.sources} source(s), ${r.chunks} chunks. Go to Ask and query your company →`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'ingest failed');
    } finally { setIngesting(null); }
  }

  async function load() {
    const d = await (await fetch('/api/connections', { cache: 'no-store' })).json();
    setConnected((d.connections || []).map((c: { provider: string }) => c.provider));
  }
  useEffect(() => { load(); }, []);

  async function connect(id: string, label: string) {
    setBusy(id); setMsg(null);
    try {
      const s = await (await fetch('/api/connections/session', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ integration: id }),
      })).json();
      if (s.error) throw new Error(s.error);
      const nango = new Nango();
      const handle = nango.openConnectUI({
        onEvent: async (event) => {
          if (event.type === 'connect') {
            const payload = (event as { payload: { connectionId: string; providerConfigKey: string } }).payload;
            await fetch('/api/connections', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ provider: payload.providerConfigKey || id, connectionId: payload.connectionId }),
            });
            setMsg(`Connected ${label} ✓ — HiUnicorn can now learn from it.`);
            load();
          }
        },
      });
      handle.setSessionToken(s.token);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'connect failed');
    } finally { setBusy(null); }
  }

  return (
    <main className="pane" style={{ gridColumn: '1 / -1', maxWidth: 760 }}>
      <h1>Connections</h1>
      <p className="sub">Connect the apps you already use. HiUnicorn learns from them, and your teammates can read and act on them for you.</p>
      {msg && <div className="warn" style={{ background: 'var(--accent-050)', borderColor: 'var(--accent)', color: 'var(--accent-600)' }}>{msg}</div>}
      <div style={{ marginTop: 16 }}>
        {CONNECTORS.map((c) => {
          const isOn = connected.includes(c.id);
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 10, background: 'var(--surface)' }}>
              <span style={{ fontSize: 22 }}>{c.emoji}</span>
              <strong style={{ flex: 1 }}>{c.label}</strong>
              {isOn
                ? <>
                    {INGESTABLE.has(c.id) && (
                      <button className="btn ghost" onClick={() => ingest(c.id, c.label)} disabled={ingesting === c.id}>
                        {ingesting === c.id ? 'Reading…' : 'Learn from this'}
                      </button>
                    )}
                    <span className="status-pill status-succeeded">connected</span>
                  </>
                : <button className="btn" onClick={() => connect(c.id, c.label)} disabled={busy === c.id}>{busy === c.id ? '…' : 'Connect'}</button>}
            </div>
          );
        })}
      </div>
      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--fg-3)' }}>OAuth is brokered by Nango. Tokens are stored securely and never touch the browser.</p>
    </main>
  );
}
