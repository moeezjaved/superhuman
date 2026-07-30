'use client';

import { useEffect, useState } from 'react';
import type { SkillDraft } from '@/lib/types';

type Saved = SkillDraft & { id: string; createdAt: string; enabled: boolean };

export default function SkillsPage() {
  const [skills, setSkills] = useState<Saved[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch('/api/skills', { cache: 'no-store' });
    const d = await r.json();
    setSkills(d.skills || []);
  }
  useEffect(() => { load(); }, []);

  async function runNow(id: string, name: string) {
    setMsg(`Firing “${name}”…`);
    await fetch(`/api/skills/${id}/run`, { method: 'POST' });
    setMsg(`“${name}” queued — check Activity in a few seconds.`);
  }

  const trig = (t: SkillDraft['trigger']) =>
    t.type === 'schedule' ? `⏱ ${t.cron}`
    : t.type === 'inbound_email' ? `✉ inbound email`
    : t.type === 'event' ? `⚡ ${t.provider}.${t.event}`
    : t.type === 'webhook' ? '🔗 webhook' : '▶ manual';

  return (
    <main className="pane" style={{ gridColumn: '1 / -1' }}>
      <h1>Skills</h1>
      <p className="sub">Your saved skills. Scheduled ones fire on their own; run any of them now.</p>
      {msg && <div className="warn" style={{ background: 'var(--accent-050)', borderColor: 'var(--accent)', color: 'var(--accent-600)' }}>{msg}</div>}

      {skills.length === 0 && (
        <div className="preview-empty" style={{ textAlign: 'left' }}>No skills yet. Build one on “Build a skill”, then Save.</div>
      )}

      <div style={{ marginTop: 18, maxWidth: 900 }}>
        {skills.map((s) => (
          <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 12, background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{s.description}</div>
              <div style={{ marginTop: 6 }}><span className="trigger-badge">{trig(s.trigger)}</span></div>
            </div>
            <button className="btn" onClick={() => runNow(s.id, s.name)}>▶ Run now</button>
          </div>
        ))}
      </div>
    </main>
  );
}
