'use client';

import { useCallback, useEffect, useState } from 'react';

type Pending = {
  runId: string;
  skillName: string;
  source: string;
  startedAt?: string;
  gate: { stepOrd: number; label: string; action: string | null; provider: string | null };
};

export default function ApprovalsPage() {
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await (await fetch('/api/approvals', { cache: 'no-store' })).json();
      setPending(d.pending || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!t) t = setInterval(load, 12000); };
    const stop = () => { if (t) { clearInterval(t); t = null; } };
    const onVis = () => { if (document.visibilityState === 'visible') { load(); start(); } else stop(); };
    load(); if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  async function decide(p: Pending, decision: 'approved' | 'rejected') {
    setBusy(p.runId); setNote(null);
    try {
      const r = await (await fetch('/api/approvals', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ runId: p.runId, stepOrd: p.gate.stepOrd, decision }),
      })).json();
      if (r.error) throw new Error(r.error);
      setPending((list) => list.filter((x) => x.runId !== p.runId));
      setNote(decision === 'approved'
        ? `Approved — run ${r.status === 'succeeded' ? 'completed' : r.status.replace('_', ' ')}.`
        : 'Rejected — run stopped cleanly at the gate.');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'failed');
    } finally { setBusy(null); }
  }

  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '');

  return (
    <main className="pane" style={{ gridColumn: '1 / -1', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Approvals</h1>
        {!loading && <span className="status-pill" style={{ background: pending.length ? 'var(--accent-050)' : 'var(--slate-100)', color: pending.length ? 'var(--accent-600)' : 'var(--fg-3)' }}>{pending.length} waiting</span>}
      </div>
      <p className="sub">Your AI did the safe work and stopped before anything irreversible. You have the final say.</p>

      {note && <div className="warn" style={{ background: 'var(--accent-050)', borderColor: 'var(--accent)', color: 'var(--accent-600)' }}>{note}</div>}

      {loading && <div className="loading">Loading…</div>}
      {!loading && pending.length === 0 && (
        <div className="preview-empty" style={{ textAlign: 'left' }}>
          Nothing waiting on you. When a skill reaches a step that sends, posts, or deletes,
          it pauses here for your OK — everything before it already ran.
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {pending.map((p) => (
          <div key={p.runId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px 18px', marginBottom: 12, background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="status-pill status-running">awaiting approval</span>
              <strong style={{ fontSize: 15 }}>{p.skillName}</strong>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>· {p.source} · {fmt(p.startedAt)}</span>
            </div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>
              Step {p.gate.stepOrd}: <strong>{p.gate.label}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 14 }}>
              {p.gate.action ? <>action <code>{p.gate.action}</code></> : 'action'}{p.gate.provider ? ` · via ${p.gate.provider}` : ''} — this is irreversible, so it needs you.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={() => decide(p, 'approved')} disabled={busy === p.runId}>{busy === p.runId ? '…' : 'Approve & run'}</button>
              <button className="btn ghost" onClick={() => decide(p, 'rejected')} disabled={busy === p.runId}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
