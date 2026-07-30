import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import type { SkillDraft } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ skills: await store.listSkills() });
}

export async function POST(req: NextRequest) {
  const { skill } = (await req.json()) as { skill: SkillDraft };
  if (!skill?.name) return NextResponse.json({ error: 'skill required' }, { status: 400 });
  const saved = await store.saveSkill(skill);
  return NextResponse.json({ saved });
}
