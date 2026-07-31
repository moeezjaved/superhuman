'use client';

import { useEffect, useState } from 'react';

/** Plain-language settings. Rules persist locally for now; enforcement is wired
 *  into the run engine separately. Everything reads like a sentence, not a form. */
export default function SettingsClient({ email }: { email: string }) {
  const [autoUnder, setAutoUnder] = useState('50');
  const [askOver, setAskOver] = useState('500');
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d.settings) { setAutoUnder(String(d.settings.autoApproveUnder)); setAskOver(String(d.settings.askOver)); } })
      .catch(() => {});
  }, []);

  async function saveRules() {
    setSaving(true); setSaved(null);
    try {
      await fetch('/api/settings', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ autoApproveUnder: Number(autoUnder || 0), askOver: Number(askOver || 0) }),
      });
      const t = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      setSaved(`Saved ${t} · your team follows these now`);
    } catch {
      setSaved('Couldn’t save — try again');
    } finally { setSaving(false); }
  }

  return (
    <main className="pane">
      <h1>Settings</h1>
      <p className="sub">Everything about your account, your team, and how HiUnicorn works for you — in plain language.</p>

      {/* ACCOUNT */}
      <Section title="Your account">
        <Row label="Signed in as"><span className="mono">{email}</span></Row>
        <Row label="Plan"><span>Starter · <span className="mono">$999/mo</span> · 5 seats</span></Row>
      </Section>

      {/* APPROVAL RULES */}
      <Section title="When to ask you first">
        <p style={{ fontFamily: 'var(--voice)', fontSize: 18, lineHeight: 1.7 }}>
          Automatically say <em>yes</em> to refunds under{' '}
          <Money value={autoUnder} onChange={setAutoUnder} />.<br />
          Always <em>ask me</em> before anything over{' '}
          <Money value={askOver} onChange={setAskOver} />.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <button className="btn" onClick={saveRules} disabled={saving}>{saving ? 'Saving…' : 'Save these rules'}</button>
          {saved && <span className="mono" style={{ fontSize: 12, color: 'var(--sage)' }}>{saved}</span>}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 12 }}>
          Anything above your limit always waits for you under <a href="/approvals" style={{ color: 'var(--graphite)', borderBottom: '1px solid var(--hairline-strong)' }}>Approvals</a>.
        </p>
      </Section>

      {/* TEAM & SEATS */}
      <Section title="Your people">
        <Row label="Seats used"><span><span className="mono">1</span> of <span className="mono">5</span> on the Starter plan</span></Row>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{email}</div>
            <div style={{ fontSize: 12.5, color: 'var(--graphite)' }}>Owner · can approve anything</div>
          </div>
          <span className="status-pill status-succeeded">you</span>
        </div>
        <button className="btn ghost" style={{ marginTop: 12 }}>Invite someone</button>
        <p style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 10 }}>
          Your AI teammates live on the <a href="/skills" style={{ color: 'var(--graphite)', borderBottom: '1px solid var(--hairline-strong)' }}>Team</a> page — they don’t use up seats.
        </p>
      </Section>

      {/* BILLING */}
      <Section title="Billing">
        <Row label="Current plan"><span>Starter · <span className="mono">$999/mo</span></span></Row>
        <Row label="This month’s usage">
          <div style={{ minWidth: 200 }}>
            <div style={{ height: 8, background: 'var(--hairline)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: '38%', height: '100%', background: 'var(--ink)' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>38% of what’s included</div>
          </div>
        </Row>
        <div style={{ marginTop: 8 }}>
          <div className="eyebrow calm" style={{ marginBottom: 8 }}><span>Recent invoices</span><span className="grow" /></div>
          {[['1 Aug 2026', '$999.00'], ['1 Jul 2026', '$999.00']].map(([d, a]) => (
            <div key={d} className="receipt done">
              <span className="t" style={{ width: 96 }}>{d}</span>
              <span className="mark" aria-hidden>✓</span>
              <span className="body">Starter plan <span className="dim">— paid</span> <span style={{ float: 'right' }}>{a}</span></span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn">Upgrade to Team</button>
          <button className="btn ghost">Update payment</button>
        </div>
      </Section>

      {/* SECURITY */}
      <Section title="Security &amp; your data">
        <Row label="Where your data lives"><span className="mono">us-east</span></Row>
        <Row label="Company sign-in (SSO)"><span style={{ color: 'var(--graphite)' }}>Available on Enterprise</span></Row>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn ghost">Export all my data</button>
          <form action="/auth/signout" method="post"><button className="btn ghost">Sign out</button></form>
        </div>
      </Section>

      <style>{`.mono{font-family:var(--mono);font-size:13px}`}</style>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 8 }}>
      <div className="rule" />
      <div className="eyebrow calm"><span dangerouslySetInnerHTML={{ __html: title }} /><span className="grow" /></div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--hairline)', alignItems: 'center' }}>
      <div style={{ width: 180, fontSize: 13.5, color: 'var(--graphite)', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 14 }}>{children}</div>
    </div>
  );
}

function Money({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', borderBottom: '2px solid var(--ember-line)' }}>
      <span style={{ color: 'var(--graphite)' }}>$</span>
      <input value={value} inputMode="numeric"
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        style={{ width: `${Math.max(2, value.length)}ch`, border: 0, outline: 'none', background: 'transparent',
          font: 'inherit', fontFamily: 'var(--mono)', color: 'var(--ember)', padding: '0 2px' }} />
    </span>
  );
}
