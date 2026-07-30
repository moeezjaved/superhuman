import { NextRequest, NextResponse } from 'next/server';
import { executeRun, type RunEvent } from '@/lib/run-engine';
import { StubToolExecutor } from '@/lib/tools';
import type { SkillDraft, ApprovalRequest } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Runs a compiled skill with stubbed tools. `decision` controls the approval gate
 * ('approve' | 'reject') so the UI can demo both the happy path and the safe-stop.
 * Returns the run + the event log so the UI can render the trace.
 */
export async function POST(req: NextRequest) {
  try {
    const { skill, decision } = (await req.json()) as {
      skill: SkillDraft;
      decision?: 'approve' | 'reject';
    };
    if (!skill) return NextResponse.json({ error: 'skill required' }, { status: 400 });

    const events: RunEvent[] = [];
    const run = await executeRun(skill, {
      workspaceId: 'ws_demo',
      executor: new StubToolExecutor(),
      approve: async (_req: ApprovalRequest) =>
        decision === 'reject' ? 'rejected' : 'approved',
      onEvent: (e) => events.push(e),
      simulateWaits: false, // don't actually sleep in a request
    });

    return NextResponse.json({ run, events });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'run failed' },
      { status: 500 },
    );
  }
}
