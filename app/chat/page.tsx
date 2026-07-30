'use client';

import { useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string; sources?: { source: string; score: number }[] };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  async function send() {
    const q = input.trim();
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
      <h1>Ask about your company</h1>
      <p className="sub">Grounded in your connected knowledge — every answer cites its sources.</p>

      <div ref={scroller} style={{ flex: 1, overflow: 'auto', paddingRight: 8, maxWidth: 820 }}>
        {messages.length === 0 && (
          <div className="preview-empty" style={{ textAlign: 'left' }}>
            Ask anything about the business. Add knowledge first on the <a href="/knowledge">Knowledge</a> page
            (paste text or a URL), then ask — e.g. “What do we sell and who is it for?”
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
