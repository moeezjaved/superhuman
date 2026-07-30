import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/auth';
import { createConnectSession, CONNECTORS, NANGO_ENABLED } from '@/lib/nango';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  if (!NANGO_ENABLED) return NextResponse.json({ error: 'Nango not configured' }, { status: 503 });
  const ws = await getWorkspaceId();
  const { integration } = (await req.json().catch(() => ({}))) as { integration?: string };
  const allowed = integration ? [integration] : CONNECTORS.map((c) => c.id);
  const session = await createConnectSession(ws, allowed);
  return NextResponse.json(session);
}
