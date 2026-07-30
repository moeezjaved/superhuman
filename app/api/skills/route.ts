import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import type { SkillDraft } from '@/lib/types';
import { getWorkspaceId } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ skills: await store.listSkills(await getWorkspaceId()) });
}
export async function POST(req: NextRequest) {
  const ws = await getWorkspaceId();
  const { skill } = (await req.json()) as { skill: SkillDraft };
  if (!skill?.name) return NextResponse.json({ error: 'skill required' }, { status: 400 });
  const saved = await store.saveSkill(skill, ws);
  return NextResponse.json({ saved });
}
