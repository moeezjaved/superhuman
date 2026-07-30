import { NextRequest, NextResponse } from 'next/server';
import { compileSkill } from '@/lib/compiler';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { description, connectedProviders } = await req.json();
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'description required' }, { status: 400 });
    }
    const result = await compileSkill({
      description,
      connectedProviders: connectedProviders ?? ['gmail', 'dropbox', 'linkedin'],
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('compile error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'compile failed' },
      { status: 500 },
    );
  }
}
