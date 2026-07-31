import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getWorkspaceId } from '@/lib/auth';
import { resumeRun } from '@/lib/run-engine';
import { RealToolExecutor } from '@/lib/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** The approval inbox: every run suspended at a human gate, with what's waiting. */
export async function GET() {
  const ws = await getWorkspaceId();
  const runs = await store.listRuns(ws, 200);
  const pending = runs
    .filter((r) => r.status === 'awaiting_approval')
    .map((r) => {
      const gate = r.steps.find((s) => s.status === 'awaiting_approval');
      return gate
        ? {
            runId: r.id,
            skillName: r.skillName ?? r.skillId,
            source: r.source ?? 'manual',
            startedAt: r.startedAt,
            gate: { stepOrd: gate.ord, label: gate.label, action: gate.action, provider: gate.provider },
          }
        : null;
    })
    .filter(Boolean);
  return NextResponse.json({ pending });
}

/** Decide a gate → resume the run. body: { runId, stepOrd, decision: 'approved'|'rejected' } */
export async function POST(req: NextRequest) {
  const ws = await getWorkspaceId();
  const { runId, stepOrd, decision } = (await req.json()) as {
    runId: string; stepOrd: number; decision: 'approved' | 'rejected';
  };
  if (!runId || !stepOrd || (decision !== 'approved' && decision !== 'rejected'))
    return NextResponse.json({ error: 'runId, stepOrd, decision required' }, { status: 400 });

  const run = await store.getRun(runId);
  if (!run || run.workspaceId !== ws) return NextResponse.json({ error: 'run not found' }, { status: 404 });
  if (run.status !== 'awaiting_approval') return NextResponse.json({ error: `run is ${run.status}, not awaiting approval` }, { status: 409 });

  const skill = await store.getSkill(run.skillId);
  if (!skill) return NextResponse.json({ error: 'skill for this run no longer exists' }, { status: 404 });

  const resumed = await resumeRun(skill, run, { stepOrd, decision }, {
    workspaceId: ws,
    executor: new RealToolExecutor(),
    simulateWaits: false,
  });
  await store.saveRun(resumed);
  return NextResponse.json({ ok: true, status: resumed.status, runId: resumed.id });
}
