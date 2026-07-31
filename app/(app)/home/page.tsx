'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Run } from '@/lib/types';

type Pending = {
  runId: string; skillName: string; source: string; startedAt?: string;
  gate: { stepOrd: number; label: string; action: string | null; provider: string | null };
};

export default function HomePage() {
  const [pending, setPending] = useState<Pending[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([
        fetch('/api/approvals', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/runs', { cache: 'no-store' }).then((x) => x.json()),
      ]);
      setPending(a.pending || []);
      setRuns(r.runs || []);
      setError(null);
    } catch {
      setError('I couldn’t reach your account just now. I’ll keep trying.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!t) t = setInterval(load, 15000); };
    const stop = () => { if (t) { clearInterval(t); t = null; } };
    const onVis = () => { if (document.visibilityState === 'visible') { load(); start(); } else stop(); };
    load(); if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  async function decide(p: Pending, decision: 'approved' | 'rejected') {
    setBusy(p.runId);
    try {
      const r = await fetch('/api/approvals', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ runId: p.runId, stepOrd: p.gate.stepOrd, decision }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setPending((l) => l.filter((x) => x.runId !== p.runId));
      load();
    } catch { /* keep it on screen; they can retry */ }
    finally { setBusy(null); }
  }

  const done = useMemo(
    () => runs.filter((r) => r.status === 'succeeded').slice(0, 8),
    [runs],
  );
  const hoursSaved = useMemo(
    () => runs.reduce((n, r) => n + (r.hoursSaved ?? 0), 0),
    [runs],
  );

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '');

  return (
    <main className="pane">
      <p className="dateline">{today} — here’s where things stand</p>
      <h1>Your business, running.</h1>
      <div className="rule heavy" />

      {loading && <BriefSkeleton />}

      {!loading && error && (
        <div className="error"><div className="what">Can’t load right now</div>{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* NEEDS YOU */}
          <section aria-live="polite">
            <div className={`eyebrow ${pending.length ? '' : 'calm'}`}>
              <span>Needs you</span>
              {pending.length > 0 && <span className="count">{pending.length}</span>}
              <span className="grow" />
            </div>
            {pending.length === 0 ? (
              <p style={{ fontFamily: 'var(--voice)', fontStyle: 'italic', fontSize: 18, color: 'var(--sage)' }}>
                Nothing needs you right now. Enjoy it.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pending.map((p) => (
                  <div className="approval" key={p.runId}>
                    <div className="a-title">{p.skillName}</div>
                    <div className="a-meta">{p.gate.label}{p.gate.provider ? ` · using ${p.gate.provider}` : ''}</div>
                    <div className="a-flag">This one can’t be undone, so I stopped to check with you.</div>
                    <div className="a-actions">
                      <button className="btn" onClick={() => decide(p, 'approved')} disabled={busy === p.runId}>{busy === p.runId ? '…' : 'Yes, go ahead'}</button>
                      <button className="btn ghost" onClick={() => decide(p, 'rejected')} disabled={busy === p.runId}>No, skip it</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="rule" />

          {/* WHILE YOU WERE AWAY */}
          <section>
            <div className="eyebrow calm"><span>While you were away</span><span className="grow" /></div>
            {done.length === 0 ? (
              <div className="empty">
                <strong>No work done yet.</strong>
                Once you <a href="/build">hire a teammate</a> or <a href="/connections">connect an app</a>, everything they do shows up here — with a receipt for each one.
              </div>
            ) : (
              <div>
                {done.map((r) => (
                  <div className="receipt done" key={r.id}>
                    <span className="t">{time(r.startedAt)}</span>
                    <span className="mark" aria-hidden>✓</span>
                    <span className="body">{r.skillName ?? 'A teammate'} <span className="dim">— finished{r.hoursSaved ? `, saved about ${r.hoursSaved}h` : ''}</span></span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="rule" />

          {/* THIS WEEK */}
          <section>
            <div className="eyebrow calm"><span>So far</span><span className="grow" /></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--voice)', fontSize: 40, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{hoursSaved ? hoursSaved.toFixed(1) : '0'}</span>
              <span style={{ fontFamily: 'var(--voice)', fontStyle: 'italic', fontSize: 19, color: 'var(--graphite)' }}>hours handed back to you</span>
              <a href="/activity" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--graphite)', borderBottom: '1px solid var(--hairline-strong)' }}>see everything →</a>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function BriefSkeleton() {
  return (
    <div>
      <div className="skeleton skel-line" style={{ width: '30%', height: 10, marginTop: 20 }} />
      <div className="skeleton skel-card" style={{ marginTop: 12 }} />
      <div className="skeleton skel-line" style={{ width: '25%', height: 10, marginTop: 24 }} />
      <div className="skeleton skel-line" style={{ width: '80%' }} />
      <div className="skeleton skel-line" style={{ width: '70%' }} />
      <div className="skeleton skel-line" style={{ width: '75%' }} />
    </div>
  );
}
