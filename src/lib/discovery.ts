/**
 * Cortex — Discovery engine (IP piece #6).
 * Mines the business context (knowledge layer + optional user note) and proposes
 * TAILORED automation opportunities — only ones feasible with real capabilities.
 * LemonLime just seeds the same 10 templates for everyone; this is per-business.
 * Each suggestion's `description` is phrased so the compiler can turn it into a Skill.
 */
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { retrieve } from './knowledge';
import { catalogForWorkspace } from './capabilities';

export const SuggestionSchema = z.object({
  suggestions: z.array(z.object({
    title: z.string(),
    description: z.string(),          // a skill instruction, feedable to the compiler
    estMinutesPerWeek: z.number(),    // ranking signal
    suggestedTrigger: z.string(),     // e.g. "every Monday 8am", "on new lead email"
    category: z.enum(['sales', 'marketing', 'operations', 'support']),
    rationale: z.string(),            // why this is worth automating for THEM
  })).max(6),
});
export type Suggestion = z.infer<typeof SuggestionSchema>['suggestions'][number];

export async function discoverOpportunities(input: { connectedProviders: string[]; note?: string; workspaceId?: string }): Promise<Suggestion[]> {
  const hits = await retrieve(input.note || 'what this business does, who its customers are, and its repetitive recurring work', 6, input.workspaceId ?? 'ws_demo');
  const ctx = hits.map((h) => `(${h.source}) ${h.text}`).join('\n\n') || '(no company knowledge yet)';
  const { connected, supported } = catalogForWorkspace(new Set(input.connectedProviders));
  const caps = [...connected, ...supported].map((a) => a.id).join(', ');

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: SuggestionSchema,
    system:
      `You are Cortex's discovery engine. Find the highest-leverage REPETITIVE work THIS specific ` +
      `business could hand to an AI team. Only propose automations feasible with these capabilities ` +
      `(write actions) — reads are always available: ${caps}. Never propose something needing a ` +
      `capability not listed. Rank by realistic time saved per week. Each "description" MUST be a ` +
      `plain-English skill instruction the compiler can turn into an automation (include the trigger ` +
      `cadence in the wording). Tailor everything to the business context — no generic templates.`,
    prompt:
      `Business context:\n${ctx}\n\n` +
      (input.note ? `The user also described their work: "${input.note}"\n\n` : '') +
      `Propose up to 5 tailored automation opportunities, most valuable first.`,
  });

  return object.suggestions.sort((a, b) => b.estMinutesPerWeek - a.estMinutesPerWeek);
}
