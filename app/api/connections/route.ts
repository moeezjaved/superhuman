import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/auth';
import { listConnections, saveConnection } from '@/lib/connections-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ connections: await listConnections(await getWorkspaceId()) });
}
export async function POST(req: NextRequest) {
  const ws = await getWorkspaceId();
  const { provider, connectionId } = (await req.json()) as { provider: string; connectionId: string };
  if (!provider || !connectionId) return NextResponse.json({ error: 'provider + connectionId required' }, { status: 400 });
  await saveConnection(ws, provider, connectionId);
  return NextResponse.json({ ok: true });
}
