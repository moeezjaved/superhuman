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
    setMsg(`Asking “${name}” to do it now…`);
    await fetch(`/api/skills/${id}/run`, { method: 'POST' });
    setMsg(`“${name}” is on it — you’ll see the result under Activity in a few seconds.`);
  }

  const trig = (t: SkillDraft['trigger']) =>
    t.type === 'schedule' ? `On a schedule`
    : t.type === 'inbound_email' ? `When an email arrives`
    : t.type === 'event' ? `When ${t.provider} does something`
    : t.type === 'webhook' ? 'When something happens' : 'When you ask';

  return (
    <main className="pane">
      <h1>Your team</h1>
      <p className="sub">The teammates you’ve hired. Each one does its job on its own — you can also ask any of them to do it right now.</p>
      {msg && <div className="warn" style={{ background: 'var(--ember-wash)', borderColor: 'var(--ember-line)', color: 'var(--ember)' }}>{msg}</div>}

      {skills.length === 0 && (
        <div className="empty">
          <strong>No teammates yet.</strong>
          <a href="/build">Hire your first one</a> — describe a job in plain words and HiUnicorn turns it into a teammate who handles it for you.
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {skills.map((s) => (
          <div key={s.id} className="card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--voice)', fontSize: 17 }}>{s.name}</div>
              <div style={{ fontSize: 13, color: 'var(--graphite)', marginTop: 2 }}>{s.description}</div>
              <div style={{ marginTop: 8 }}><span className="trigger-badge">{trig(s.trigger)}</span></div>
            </div>
            <button className="btn ghost" onClick={() => runNow(s.id, s.name)}>Do it now</button>
          </div>
        ))}
      </div>
    </main>
  );
}
