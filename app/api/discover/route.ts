import { NextRequest, NextResponse } from 'next/server';
import { discoverOpportunities } from '@/lib/discovery';
import { getWorkspaceId } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ws = await getWorkspaceId();
    const { connectedProviders, note } = (await req.json()) as { connectedProviders?: string[]; note?: string };
    const suggestions = await discoverOpportunities({ connectedProviders: connectedProviders ?? ['gmail', 'dropbox', 'linkedin'], note, workspaceId: ws });
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'discovery failed' }, { status: 500 });
  }
}
