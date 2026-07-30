import { NextRequest, NextResponse } from 'next/server';
import { inngest, EVENTS } from '@/inngest/client';

export const runtime = 'nodejs';

/** "Run now" — fires the durable run event (same path the scheduler uses). */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await inngest.send({ name: EVENTS.RUN_REQUESTED, data: { skillId: id, source: 'manual' } });
  return NextResponse.json({ ok: true, skillId: id });
}
