'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string; sources?: { source: string; score: number }[] };
type Source = { source: string; chunks: number };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [known, setKnown] = useState(false); // loaded knowledge state yet?
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/knowledge', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setSources(d.sources || []))
      .catch(() => {})
      .finally(() => setKnown(true));
  }, []);

  const totalChunks = useMemo(() => sources.reduce((n, s) => n + s.chunks, 0), [sources]);

  // Starter questions — tailored to what's actually been ingested.
  const starters = useMemo(() => {
    const s: string[] = ['What do we sell, and who is it for?'];
    const slack = sources.find((x) => x.source.startsWith('slack:#'));
    if (slack) s.push(`Summarize the recent conversation in ${slack.source.replace('slack:', '')}`);
    if (sources.some((x) => x.source.startsWith('slack:'))) s.push('What are customers or the team worried about right now?');
    if (sources.some((x) => x.source.startsWith('notion:'))) s.push('What are our key processes or docs about?');
    if (sources.length) s.push('What should we automate first, based on what you know?');
    return s.slice(0, 4);
  }, [sources]);

  function ask(q: string) { setInput(q); setTimeout(() => sendText(q), 0); }

  async function send() { await sendText(input); }

  async function sendText(raw: string) {
    const q = raw.trim();
    if (!q || busy) return;
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      let sources: Msg['sources'] = [];
      const hdr = res.headers.get('X-Cortex-Sources');
      if (hdr) { try { sources = JSON.parse(atob(hdr)); } catch {} }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: acc, sources };
          return copy;
        });
        scroller.current?.scrollTo(0, scroller.current.scrollHeight);
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: 'Error: ' + (e instanceof Error ? e.message : 'failed') };
        return copy;
      });
    } finally { setBusy(false); }
  }

  return (
    <main className="pane" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Ask about your company</h1>
        {known && (
          totalChunks > 0
            ? <span className="status-pill status-succeeded">Cortex knows {sources.length} source{sources.length > 1 ? 's' : ''} · {totalChunks} chunks</span>
            : <span className="status-pill" style={{ background: 'var(--slate-100)', color: 'var(--fg-3)' }}>nothing learned yet</span>
        )}
      </div>
      <p className="sub">Grounded in your company’s own data — every answer cites its sources.</p>

      <div ref={scroller} style={{ flex: 1, overflow: 'auto', paddingRight: 8, maxWidth: 820 }}>
        {messages.length === 0 && known && totalChunks === 0 && (
          <div className="preview-empty" style={{ textAlign: 'left' }}>
            <strong>Cortex doesn’t know your business yet.</strong>
            <div style={{ marginTop: 8, color: 'var(--fg-2)' }}>
              Teach it in one of two ways, then come back and ask:
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                <li><a href="/connections">Connect a tool</a> (Slack, Notion) and hit “Learn from this”.</li>
                <li><a href="/knowledge">Paste text or a URL</a> — e.g. your website.</li>
              </ul>
            </div>
          </div>
        )}
        {messages.length === 0 && totalChunks > 0 && (
          <div className="preview-empty" style={{ textAlign: 'left' }}>
            <strong>Ask me anything about your business.</strong> I’ll answer from what I’ve learned and cite the source.
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {starters.map((s) => (
                <button key={s} className="chip" onClick={() => ask(s)} style={{ cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '14px 0' }}>
            {m.role === 'user' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: 'var(--slate-100)', borderRadius: 'var(--r-lg)', padding: '10px 14px', maxWidth: '75%' }}>{m.content}</div>
              </div>
            ) : (
              <div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{m.content || (busy ? '…' : '')}</div>
                {m.sources && m.sources.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.sources.map((s, j) => (
                      <span key={j} className="chip" style={{ cursor: 'default' }}>[{j + 1}] {s.source}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="composer" style={{ maxWidth: 820, marginTop: 12 }}>
        <textarea
          placeholder="Ask anything about your company…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          style={{ minHeight: 56 }}
        />
        <div className="bar">
          <button className="btn" onClick={send} disabled={busy || !input.trim()}>{busy ? 'Thinking…' : 'Ask →'}</button>
        </div>
      </div>
    </main>
  );
}
