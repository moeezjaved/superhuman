import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Reports which env vars are PRESENT (booleans only — never the values).
export async function GET() {
  const present = (k: string) => Boolean(process.env[k] && process.env[k]!.length > 3);
  return NextResponse.json({
    OPENAI_API_KEY: present('OPENAI_API_KEY'),
    DATABASE_URL: present('DATABASE_URL'),
    INNGEST_EVENT_KEY: present('INNGEST_EVENT_KEY'),
    INNGEST_SIGNING_KEY: present('INNGEST_SIGNING_KEY'),
    INNGEST_DEV: process.env.INNGEST_DEV ?? null,
    signingKeyPrefix: process.env.INNGEST_SIGNING_KEY?.slice(0, 12) ?? null,
    eventKeyLen: process.env.INNGEST_EVENT_KEY?.length ?? 0,
  });
}
