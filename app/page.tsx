'use client';

import { useState } from 'react';
import type { SkillDraft, Run } from '@/lib/types';

const EXAMPLES = [
  "Every Monday 8am, summarize last week's Stripe payments and email me, flag failed ones",
  'Find 5 US small-business leads on LinkedIn and draft a connection request for each',
  'When a customer emails about a refund, check if the order was in the last 30 days, draft an approval or decline, and follow up in 3 days if no reply',
  'Every morning, post yesterday’s top support questions to our #team Slack channel',
];

type CompileResp = { skill: SkillDraft; warnings: string[] };
type RunResp = { run: Run };

export default function BuildPage() {
  const [desc, setDesc] = useState('');
  const [compiling, setCompiling] = useState(false);
  const [skill, setSkill] = useState<SkillDraft | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  async function compile() {
    if (!desc.trim()) return;
    setCompiling(true); setError(null); setRun(null); setSkill(null);
    try {
      const r = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description: desc }),
      });
      const data = (await r.json()) as CompileResp & { error?: string };
      if (!r.ok) throw new Error(data.error || 'compile failed');
      setSkill(data.skill); setWarnings(data.warnings || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'compile failed');
    } finally {
      setCompiling(false);
    }
  }

  async function save() {
    if (!skill) return;
    setSaved('Saving…');
    const r = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ skill }),
    });
    if (r.ok) setSaved('Saved ✓  — armed. Scheduled skills now fire on their own (see Activity).');
    else setSaved('Save failed');
  }

  async function doRun(decision: 'approve' | 'reject') {
    if (!skill) return;
    setRunning(true); setRun(null);
    try {
      const r = await fetch('/api/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ skill, decision }),
      });
      const data = (await r.json()) as RunResp & { error?: string };
      if (!r.ok) throw new Error(data.error || 'run failed');
      setRun(data.run);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'run failed');
    } finally {
      setRunning(false);
    }
  }

  const triggerLabel = (t: SkillDraft['trigger']) => {
    switch (t.type) {
      case 'schedule': return `⏱ Schedule · ${t.cron}`;
      case 'inbound_email': return `✉ Inbound email · ${t.address}`;
      case 'webhook': return `🔗 Webhook`;
      case 'event': return `⚡ Event · ${t.provider}.${t.event}`;
      default: return '▶ Manual';
    }
  };

  return (
    <main className="main">
      {/* LEFT: describe */}
      <section className="pane">
        <h1>What should your AI team automate?</h1>
        <p className="sub">Describe it like you would to a coworker. Cortex compiles it into a skill that runs on its own.</p>

        <div className="composer">
          <textarea
            placeholder="e.g. Every Monday 8am, email me last week's revenue and flag failed payments…"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') compile(); }}
          />
          <div className="bar">
            <button className="btn" onClick={compile} disabled={compiling || !desc.trim()}>
              {compiling ? 'Compiling…' : 'Compile skill  →'}
            </button>
          </div>
        </div>

        <div className="examples">
          {EXAMPLES.map((ex) => (
            <span key={ex} className="chip" onClick={() => setDesc(ex)}>{ex.slice(0, 46)}…</span>
          ))}
        </div>

        {error && <div className="warn">⚠ {error}</div>}
      </section>

      {/* RIGHT: live preview + run */}
      <section className="pane right">
        <span className="eyebrow">Preview</span>
        {!skill && !compiling && (
          <div className="preview-empty">Your compiled skill will appear here —<br />with a real trigger, steps, and approvals.</div>
        )}
        {compiling && <div className="loading" style={{ marginTop: 24 }}>Compiling your skill…</div>}

        {skill && (
          <>
            <div className="skill-name">{skill.name}</div>
            <div className="skill-desc">{skill.description}</div>
            <div className="trigger-badge">{triggerLabel(skill.trigger)}</div>

            <div className="steps">
              {skill.steps.map((s, i) => (
                <div className="step" key={i}>
                  <div className="num">{i + 1}</div>
                  <div className="body">
                    <div className="label">
                      {s.label}
                      {s.approval === 'require_approval' && <span className="tag appr">approval</span>}
                      {s.wait && <span className="tag wait">wait</span>}
                    </div>
                    <div className="meta">{s.action ?? (s.integration ?? 'reasoning')}</div>
                  </div>
                </div>
              ))}
            </div>

            {skill.prerequisites.length > 0 && (
              <div className="prereq">
                <strong>Needs:</strong>{' '}
                {skill.prerequisites.map((p, i) => (
                  <span key={i} className={p.status === 'connected' ? 'ok' : 'miss'}>
                    {p.provider} ({p.status === 'connected' ? 'connected' : 'connect first'})
                    {i < skill.prerequisites.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="warn">{warnings.map((w, i) => <div key={i}>• {w}</div>)}</div>
            )}

            <details style={{ marginTop: 18 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--fg-2)' }}>View the SOP (hot_section)</summary>
              <div className="sop">{skill.hot_section}</div>
            </details>

            <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
              <button className="btn" onClick={save}>💾 Save &amp; arm skill</button>
              <button className="btn ghost" onClick={() => doRun('approve')} disabled={running}>
                {running ? 'Running…' : '▶ Test run'}
              </button>
              <button className="btn ghost" onClick={() => doRun('reject')} disabled={running}>
                Reject at gate
              </button>
            </div>
            {saved && <div className="warn" style={{ background: 'var(--accent-050)', borderColor: 'var(--accent)', color: 'var(--accent-600)' }}>{saved}</div>}

            {run && (
              <div style={{ marginTop: 20 }}>
                <span className="eyebrow">Run trace</span>
                <div style={{ margin: '8px 0' }}>
                  <span className={`status-pill status-${run.status}`}>{run.status}</span>
                  {run.hoursSaved != null && run.status === 'succeeded' && (
                    <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--fg-2)' }}>≈ {run.hoursSaved}h saved</span>
                  )}
                </div>
                <div className="trace">
                  {run.steps.map((s) => (
                    <div className="row" key={s.ord}>
                      <span className={`status-pill status-${s.status}`}>{s.status}</span>
                      <span style={{ flex: 1 }}>{s.ord}. {s.label}</span>
                      {s.diff && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{s.diff}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
