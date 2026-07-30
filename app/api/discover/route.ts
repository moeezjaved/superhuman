import { NextRequest, NextResponse } from 'next/server';
import { discoverOpportunities } from '@/lib/discovery';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { connectedProviders, note } = (await req.json()) as { connectedProviders?: string[]; note?: string };
    const suggestions = await discoverOpportunities({ connectedProviders: connectedProviders ?? ['gmail', 'dropbox', 'linkedin'], note });
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'discovery failed' }, { status: 500 });
  }
}
