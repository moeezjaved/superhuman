import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { retrieve } from '@/lib/knowledge';
import { buildRuntimeSystemPrompt } from '@/lib/runtime-prompt';
import { getWorkspaceId } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const ws = await getWorkspaceId();
  const { messages } = (await req.json()) as { messages: { role: string; content: string }[] };
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  // Retrieve wide, then keep only genuinely relevant chunks. A weak match is
  // worse than none — it invites the model to half-answer on noise. If nothing
  // clears the bar, the prompt gets no context and Cortex says it doesn't know.
  const MIN_SCORE = 0.2;
  const hits = (await retrieve(lastUser, 8, ws)).filter((h) => h.score >= MIN_SCORE).slice(0, 5);
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
