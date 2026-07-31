import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/auth';
import { ingestProvider } from '@/lib/ingest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const ws = await getWorkspaceId();
  const { provider } = (await req.json()) as { provider: string };
  if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });
  try {
    const result = await ingestProvider(ws, provider);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'ingest failed' }, { status: 400 });
  }
}
