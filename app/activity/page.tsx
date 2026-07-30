'use client';

import { useEffect, useState } from 'react';
import type { Run } from '@/lib/types';

export default function ActivityPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch('/api/runs', { cache: 'no-store' });
    const d = await r.json();
    setRuns(d.runs || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // live: autonomous runs appear here
    return () => clearInterval(t);
  }, []);

  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '');

  return (
    <main className="pane" style={{ gridColumn: '1 / -1' }}>
      <h1>Activity</h1>
      <p className="sub">Every run your AI team has done — scheduled, triggered, or manual. Refreshes live.</p>

      {loading && <div className="loading">Loading…</div>}
      {!loading && runs.length === 0 && (
        <div className="preview-empty" style={{ textAlign: 'left' }}>
          No runs yet. Save a skill with a schedule and it will start appearing here on its own —
          or hit “Run now” from Skills.
        </div>
      )}

      <div style={{ marginTop: 18, maxWidth: 900 }}>
        {runs.map((run) => (
          <div key={run.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 12, background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`status-pill status-${run.status === 'succeeded' ? 'succeeded' : run.status === 'canceled' ? 'canceled' : 'running'}`}>
                {run.status.replace('_', ' ')}
              </span>
              <strong style={{ fontSize: 15 }}>{run.skillName ?? run.skillId}</strong>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                · {run.source ?? 'manual'} · {fmt(run.startedAt)}
              </span>
              {run.hoursSaved != null && run.status === 'succeeded' && (
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--success)' }}>≈ {run.hoursSaved}h saved</span>
              )}
            </div>
            <div className="trace" style={{ marginTop: 10 }}>
              {run.steps.map((s) => (
                <div className="row" key={s.ord}>
                  <span className={`status-pill status-${s.status === 'succeeded' ? 'succeeded' : s.status === 'awaiting_approval' ? 'running' : s.status === 'canceled' ? 'canceled' : 'running'}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                  <span style={{ flex: 1 }}>{s.ord}. {s.label}</span>
                  {s.diff && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{s.diff}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
