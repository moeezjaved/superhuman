'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Run } from '@/lib/types';

export default function ReportsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/runs', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setRuns(d.runs || []))
      .catch(() => setError('I couldn’t pull your numbers just now. Try again in a moment.'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const done = runs.filter((r) => r.status === 'succeeded');
    const hours = runs.reduce((n, r) => n + (r.hoursSaved ?? 0), 0);
    const waiting = runs.filter((r) => r.status === 'awaiting_approval').length;
    const failed = runs.filter((r) => r.status === 'failed').length;
    const approvedShare = done.length + failed > 0 ? Math.round((done.length / (done.length + failed)) * 100) : null;
    // simple by-day counts for the sparkline (last 14 buckets)
    const byDay = new Array(14).fill(0);
    const now = Date.now();
    for (const r of done) {
      if (!r.startedAt) continue;
      const days = Math.floor((now - new Date(r.startedAt).getTime()) / 86_400_000);
      if (days >= 0 && days < 14) byDay[13 - days] += 1;
    }
    return { doneCount: done.length, hours, waiting, failed, approvedShare, byDay };
  }, [runs]);

  const month = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <main className="pane">
      <p className="dateline">{month}</p>
      <h1>How it’s going</h1>
      <div className="rule heavy" />

      {loading && <ReportSkeleton />}
      {!loading && error && <div className="error"><div className="what">Can’t load your numbers</div>{error}</div>}

      {!loading && !error && (
        <>
          {/* Written summary — the company speaks */}
          <section>
            <div className="eyebrow calm"><span>In plain words</span><span className="grow" /></div>
            {stats.doneCount === 0 ? (
              <p style={{ fontFamily: 'var(--voice)', fontSize: 20, lineHeight: 1.5 }}>
                Nothing to report yet. Once your team starts working, this page tells you — in plain English —
                how much time you’re getting back and what’s worth your attention.
              </p>
            ) : (
              <p style={{ fontFamily: 'var(--voice)', fontSize: 21, lineHeight: 1.55, textWrap: 'pretty' }}>
                So far, your team has handled <strong>{stats.doneCount}</strong> {stats.doneCount === 1 ? 'job' : 'jobs'} for you,
                giving back about <strong>{stats.hours.toFixed(1)} hours</strong>.
                {stats.waiting > 0 ? <> There {stats.waiting === 1 ? 'is' : 'are'} <strong style={{ color: 'var(--ember)' }}>{stats.waiting}</strong> waiting on your okay.</> : ' Nothing is waiting on you.'}
                {stats.approvedShare != null && <> When your team acts, it gets it right <strong>{stats.approvedShare}%</strong> of the time.</>}
              </p>
            )}
          </section>

          <div className="rule" />

          {/* Three honest numbers */}
          <section>
            <div className="eyebrow calm"><span>The numbers</span><span className="grow" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="rp-grid">
              <Stat big={stats.hours.toFixed(1)} unit="hours saved" note="time handed back to you" />
              <Stat big={String(stats.doneCount)} unit="jobs done" note="finished start to finish" />
              <Stat big={stats.waiting ? String(stats.waiting) : '0'} unit="waiting on you" note={stats.waiting ? 'go say yes or no' : 'all caught up'} ember={stats.waiting > 0} />
            </div>
          </section>

          <div className="rule" />

          {/* Activity over time */}
          <section>
            <div className="eyebrow calm"><span>Work over the last two weeks</span><span className="grow" /></div>
            <Spark data={stats.byDay} />
            <p style={{ fontSize: 13, color: 'var(--graphite)', marginTop: 10 }}>
              {stats.doneCount === 0 ? 'No work yet — this fills in as your team gets going.' : 'Each bar is a day. Taller means more jobs handled that day.'}
            </p>
          </section>
        </>
      )}
      <style>{`@media (max-width:640px){.rp-grid{grid-template-columns:1fr!important}}`}</style>
    </main>
  );
}

function Stat({ big, unit, note, ember }: { big: string; unit: string; note: string; ember?: boolean }) {
  return (
    <div className="card">
      <div style={{ fontFamily: 'var(--voice)', fontSize: 38, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: ember ? 'var(--ember)' : 'var(--ink)' }}>{big}</div>
      <div style={{ fontFamily: 'var(--voice)', fontStyle: 'italic', fontSize: 15, color: 'var(--graphite)', marginTop: 6 }}>{unit}</div>
      <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>{note}</div>
    </div>
  );
}

function Spark({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, marginTop: 14 }}>
      {data.map((v, i) => (
        <div key={i} title={`${v} jobs`} style={{
          flex: 1, height: `${Math.max(4, (v / max) * 100)}%`,
          background: i === data.length - 1 ? 'var(--ember)' : 'var(--hairline-strong)',
          borderRadius: 3, transition: 'height var(--t-move) var(--ease)',
        }} />
      ))}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div>
      <div className="skeleton skel-line" style={{ width: '22%', height: 10, marginTop: 20 }} />
      <div className="skeleton skel-line" style={{ width: '90%', height: 16, marginTop: 12 }} />
      <div className="skeleton skel-line" style={{ width: '80%', height: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 28 }}>
        <div className="skeleton skel-card" /><div className="skeleton skel-card" /><div className="skeleton skel-card" />
      </div>
    </div>
  );
}
