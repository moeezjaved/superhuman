import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/settings-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ settings: await getSettings(await getWorkspaceId()) });
}

export async function POST(req: NextRequest) {
  const ws = await getWorkspaceId();
  const body = (await req.json()) as { autoApproveUnder?: number; askOver?: number };
  const settings = await saveSettings(ws, body);
  return NextResponse.json({ settings });
}
