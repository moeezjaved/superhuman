import { NextRequest, NextResponse } from 'next/server';
import { ingestText, ingestUrl, listSources } from '@/lib/knowledge';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ sources: await listSources() });
}

export async function POST(req: NextRequest) {
  try {
    const { text, url, source } = (await req.json()) as { text?: string; url?: string; source?: string };
    let added = 0;
    if (url) added = await ingestUrl(url);
    else if (text) added = await ingestText(source || 'Pasted note', text);
    else return NextResponse.json({ error: 'text or url required' }, { status: 400 });
    return NextResponse.json({ added });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'ingest failed' }, { status: 500 });
  }
}
