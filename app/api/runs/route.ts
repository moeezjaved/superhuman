import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getWorkspaceId } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ runs: await store.listRuns(await getWorkspaceId()) });
}
