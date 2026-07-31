'use client';

import { useState } from 'react';
import type { SkillDraft, Run } from '@/lib/types';

const EXAMPLES = [
  'Every Monday morning, email me last week’s sales and point out anything that failed',
  'When a customer asks for a refund, check the order and get it ready for me to approve',
  'Each morning, post yesterday’s top customer questions to our team chat',
  'Find a few new customers like my best ones and write a friendly first message',
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
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description: desc }),
      });
      const data = (await r.json()) as CompileResp & { error?: string };
      if (!r.ok) throw new Error(data.error || 'Something went wrong reading that. Try describing it a little differently.');
      setSkill(data.skill); setWarnings(data.warnings || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally { setCompiling(false); }
  }

  async function save() {
    if (!skill) return;
    setSaved('Saving…');
    const r = await fetch('/api/skills', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ skill }),
    });
    setSaved(r.ok ? 'Hired ✓ — they’ll start on their own. You’ll see their work under Activity.' : 'Couldn’t save that — try again.');
  }

  async function doRun(decision: 'approve' | 'reject') {
    if (!skill) return;
    setRunning(true); setRun(null);
    try {
      const r = await fetch('/api/run', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ skill, decision }),
      });
      const data = (await r.json()) as RunResp & { error?: string };
      if (!r.ok) throw new Error(data.error || 'run failed');
      setRun(data.run);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'run failed');
    } finally { setRunning(false); }
  }

  const triggerLabel = (t: SkillDraft['trigger']) => {
    switch (t.type) {
      case 'schedule': return `On a schedule · ${t.cron}`;
      case 'inbound_email': return `When an email arrives · ${t.address}`;
      case 'webhook': return 'When something happens elsewhere';
      case 'event': return `When ${t.provider} does something`;
      default: return 'When you ask';
    }
  };

  return (
    <main className="pane">
      <h1>Hire a new teammate</h1>
      <p className="sub">Describe a job in your own words, like you’d explain it to a new hire. HiUnicorn turns it into a teammate who does it for you — and always checks with you before anything that can’t be undone.</p>

      <div className="composer">
        <textarea
          placeholder="e.g. Every Monday morning, email me last week’s sales and point out anything that failed…"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') compile(); }}
        />
        <div className="bar">
          <button className="btn" onClick={compile} disabled={compiling || !desc.trim()}>
            {compiling ? 'Reading…' : 'Write the job →'}
          </button>
        </div>
      </div>

      <div className="examples" style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {EXAMPLES.map((ex) => (
          <span key={ex} className="chip" onClick={() => setDesc(ex)}>{ex.slice(0, 42)}…</span>
        ))}
      </div>

      {error && <div className="error" style={{ marginTop: 18 }}><div className="what">That didn’t work</div>{error}</div>}
      {compiling && <div className="loading" style={{ marginTop: 24 }}>Reading what you wrote…</div>}

      {skill && (
        <div style={{ marginTop: 30 }}>
          <div className="rule heavy" />
          <span className="eyebrow"><span>The job</span><span className="grow" /></span>
          <h2 style={{ marginBottom: 6 }}>{skill.name}</h2>
          <p className="skill-desc">{skill.description}</p>
          <div className="trigger-badge">{triggerLabel(skill.trigger)}</div>

          <div className="steps">
            {skill.steps.map((s, i) => (
              <div className="step" key={i}>
                <div className="num">{i + 1}</div>
                <div className="body">
                  <div className="label">
                    {s.label}
                    {s.approval === 'require_approval' && <span className="tag appr">asks you first</span>}
                    {s.wait && <span className="tag wait">waits</span>}
                  </div>
                  <div className="meta">{s.action ?? (s.integration ?? 'thinks it through')}</div>
                </div>
              </div>
            ))}
          </div>

          {skill.prerequisites.length > 0 && (
            <div className="prereq">
              <strong>Needs these apps:</strong>{' '}
              {skill.prerequisites.map((p, i) => (
                <span key={i} className={p.status === 'connected' ? 'ok' : 'miss'}>
                  {p.provider} ({p.status === 'connected' ? 'connected' : 'connect first'}){i < skill.prerequisites.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}

          {warnings.length > 0 && <div className="warn">{warnings.map((w, i) => <div key={i}>• {w}</div>)}</div>}

          <details style={{ marginTop: 18 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--graphite)' }}>See the full instructions</summary>
            <div className="sop">{skill.hot_section}</div>
          </details>

          <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            <button className="btn" onClick={save}>Hire this teammate</button>
            <button className="btn ghost" onClick={() => doRun('approve')} disabled={running}>{running ? 'Trying it…' : 'Try it once'}</button>
          </div>
          {saved && <div className="warn" style={{ background: 'var(--ember-wash)', borderColor: 'var(--ember-line)', color: 'var(--ember)' }}>{saved}</div>}

          {run && (
            <div style={{ marginTop: 22 }}>
              <span className="eyebrow"><span>What happened</span><span className="grow" /></span>
              <div style={{ margin: '8px 0' }}>
                <span className={`status-pill status-${run.status === 'succeeded' ? 'succeeded' : run.status === 'canceled' ? 'canceled' : 'running'}`}>{run.status.replace('_', ' ')}</span>
                {run.hoursSaved != null && run.status === 'succeeded' && (
                  <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--graphite)' }}>≈ {run.hoursSaved}h saved</span>
                )}
              </div>
              <div className="trace">
                {run.steps.map((s) => (
                  <div className="row" key={s.ord}>
                    <span className={`status-pill status-${s.status === 'succeeded' ? 'succeeded' : s.status === 'awaiting_approval' ? 'running' : s.status === 'canceled' ? 'canceled' : 'running'}`}>{s.status.replace('_', ' ')}</span>
                    <span style={{ flex: 1 }}>{s.ord}. {s.label}</span>
                    {s.diff && <span style={{ fontSize: 12, color: 'var(--faint)', fontFamily: 'var(--mono)' }}>{s.diff}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
