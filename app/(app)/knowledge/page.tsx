'use client';

import { useEffect, useState } from 'react';

export default function KnowledgePage() {
  const [sources, setSources] = useState<{ source: string; chunks: number }[]>([]);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const d = await (await fetch('/api/knowledge', { cache: 'no-store' })).json();
    setSources(d.sources || []);
  }
  useEffect(() => { load(); }, []);

  async function add(body: object, label: string) {
    setBusy(true); setMsg(`Learning from ${label}…`);
    const d = await (await fetch('/api/knowledge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
    setBusy(false);
    if (d.error) setMsg('Error: ' + d.error);
    else { setMsg(`Learned ${d.added} chunk(s) from ${label}.`); setText(''); setUrl(''); setName(''); load(); }
  }

  return (
    <main className="pane" style={{ gridColumn: '1 / -1', maxWidth: 820 }}>
      <h1>Knowledge</h1>
      <p className="sub">Teach Cortex about your business. It embeds this and grounds every answer in it.</p>

      <div className="composer" style={{ marginBottom: 14 }}>
        <input placeholder="Source name (e.g. About page, Pricing)" value={name} onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', border: 0, outline: 0, padding: '12px 16px', font: 'inherit', background: 'transparent' }} />
        <textarea placeholder="Paste company info: what you sell, ICP, pricing, policies, voice…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="bar"><button className="btn" disabled={busy || !text.trim()} onClick={() => add({ text, source: name || 'Pasted note' }, name || 'note')}>Add knowledge</button></div>
      </div>

      <div className="composer" style={{ marginBottom: 14 }}>
        <input placeholder="…or a URL to learn from (https://yoursite.com)" value={url} onChange={(e) => setUrl(e.target.value)}
          style={{ width: '100%', border: 0, outline: 0, padding: '12px 16px', font: 'inherit', background: 'transparent' }} />
        <div className="bar"><button className="btn ghost" disabled={busy || !url.trim()} onClick={() => add({ url }, url)}>Learn from URL</button></div>
      </div>

      {msg && <div className="warn" style={{ background: 'var(--accent-050)', borderColor: 'var(--accent)', color: 'var(--accent-600)' }}>{msg}</div>}

      <h3 style={{ marginTop: 24, fontSize: 14, color: 'var(--fg-2)' }}>What Cortex knows ({sources.length} sources)</h3>
      {sources.map((s, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 14px', marginTop: 8, background: 'var(--surface)' }}>
          <span>{s.source}</span><span style={{ color: 'var(--fg-3)', fontSize: 13 }}>{s.chunks} chunks</span>
        </div>
      ))}
      <div style={{ marginTop: 18 }}><a href="/chat">→ Now go ask a question</a></div>
    </main>
  );
}
