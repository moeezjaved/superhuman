import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { retrieve } from '@/lib/knowledge';
import { buildRuntimeSystemPrompt } from '@/lib/runtime-prompt';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: { role: string; content: string }[] };
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const hits = await retrieve(lastUser, 5);
  const system = buildRuntimeSystemPrompt(hits);

  const result = streamText({
    model: openai('gpt-4o'),
    system,
    messages: messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  });

  const sources = hits.map((h) => ({ source: h.source, score: Math.round(h.score * 100) / 100 }));
  return result.toTextStreamResponse({
    headers: { 'X-Cortex-Sources': Buffer.from(JSON.stringify(sources)).toString('base64') },
  });
}
