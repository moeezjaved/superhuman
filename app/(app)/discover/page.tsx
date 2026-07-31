'use client';

import { useState } from 'react';
import type { Suggestion } from '@/lib/discovery';

export default function DiscoverPage() {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function discover() {
    setBusy(true); setError(null); setSuggestions([]);
    try {
      const d = await (await fetch('/api/discover', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note }),
      })).json();
      if (d.error) throw new Error(d.error);
      setSuggestions(d.suggestions || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'failed'); }
    finally { setBusy(false); }
  }

  async function createSkill(i: number, s: Suggestion) {
    setStatus((x) => ({ ...x, [i]: 'Compiling…' }));
    const c = await (await fetch('/api/compile', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ description: s.description }),
    })).json();
    if (!c.skill) { setStatus((x) => ({ ...x, [i]: 'Compile failed' })); return; }
    setStatus((x) => ({ ...x, [i]: 'Saving…' }));
    await fetch('/api/skills', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ skill: c.skill }),
    });
    setStatus((x) => ({ ...x, [i]: `Created & armed ✓ (${c.skill.name})` }));
  }

  return (
    <main className="pane" style={{ gridColumn: '1 / -1', maxWidth: 900 }}>
      <h1>Ideas for you</h1>
      <p className="sub">Based on what it’s learned about your business, HiUnicorn suggests jobs worth handing off — only ones it can actually do for you.</p>

      <div className="composer">
        <textarea placeholder="Optional: tell me about a typical day, or the work that repeats most — it helps me suggest better…"
          value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 70 }} />
        <div className="bar"><button className="btn" onClick={discover} disabled={busy}>{busy ? 'Mining your business…' : '✨ Find opportunities'}</button></div>
      </div>

      {error && <div className="warn">⚠ {error}</div>}

      <div style={{ marginTop: 18 }}>
        {suggestions.map((s, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px', marginBottom: 12, background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <strong style={{ fontSize: 16 }}>{s.title}</strong>
              <span className="tag wait">{s.category}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--success)', fontWeight: 600, fontSize: 13 }}>≈ {Math.round(s.estMinutesPerWeek)} min/week saved</span>
            </div>
            <div style={{ color: 'var(--fg-2)', fontSize: 14, marginTop: 6 }}>{s.rationale}</div>
            <div style={{ fontSize: 13, marginTop: 8 }}><strong>It would:</strong> {s.description}</div>
            <div style={{ marginTop: 8 }}><span className="trigger-badge">⏱ {s.suggestedTrigger}</span></div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn" onClick={() => createSkill(i, s)} disabled={!!status[i]}>Hire for this</button>
              {status[i] && <span style={{ fontSize: 13, color: 'var(--accent-600)' }}>{status[i]}</span>}
            </div>
          </div>
        ))}
        {!busy && suggestions.length === 0 && (
          <div className="preview-empty" style={{ textAlign: 'left' }}>
            Add some company info on the <a href="/knowledge">Knowledge</a> page first, then hit “Find opportunities”.
          </div>
        )}
      </div>
    </main>
  );
}
