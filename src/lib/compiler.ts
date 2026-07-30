/**
 * Cortex — the Skill Compiler.
 * -----------------------------------------------------------------------------
 * Turns a plain-English description into a validated, runnable Skill.
 * This is the core loop (LemonLime's `update_draft`, but grounded + trigger-aware).
 *
 * Flow:
 *   1. Build the system prompt with the workspace's capability catalog.
 *   2. Ask the model for a structured Skill (AI SDK `generateObject` + Zod schema).
 *   3. CODE-ENFORCE the capability check: any step whose `action` isn't a real
 *      capability is stripped/flagged (fixes LemonLime's "invent a connector" bug).
 *   4. Apply default approval modes for irreversible actions.
 *   5. Compute prerequisites vs the workspace's connected providers.
 *
 * Swap the model line to change providers (Claude / GPT / Gemini) — model-agnostic.
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
// import { anthropic } from '@ai-sdk/anthropic';  // drop-in alternative
import { SkillDraftSchema, type SkillDraft } from './types';
import { buildCompilerSystemPrompt } from './compiler-prompt';
import { isKnownCapability, getAtomic, defaultApprovalFor } from './capabilities';

export interface CompileInput {
  description: string;               // the user's plain-English request
  connectedProviders: string[];     // e.g. ['gmail','dropbox','linkedin']
  priorSkill?: SkillDraft;           // when editing an existing skill
}

export interface CompileResult {
  skill: SkillDraft;
  warnings: string[];                // e.g. dropped a step that used an unknown capability
}

const MODEL = openai('gpt-4o'); // swap to anthropic('claude-...') anytime — model-agnostic

export async function compileSkill(input: CompileInput): Promise<CompileResult> {
  const connected = new Set(input.connectedProviders);
  const system = buildCompilerSystemPrompt(connected);

  const userMsg = input.priorSkill
    ? `Here is the current skill draft to modify:\n${JSON.stringify(
        input.priorSkill,
        null,
        2,
      )}\n\nChange request: ${input.description}`
    : input.description;

  const { object } = await generateObject({
    model: MODEL,
    schema: SkillDraftSchema,
    system,
    prompt: userMsg,
  });

  return validateAndGround(object, connected);
}

/**
 * The part LemonLime does in a prompt (and got wrong on Stripe) — we do it in code.
 * Guarantees a compiled skill can never reference a capability that doesn't exist.
 */
export function validateAndGround(
  draft: SkillDraft,
  connected: Set<string>,
): CompileResult {
  const warnings: string[] = [];

  const steps = draft.steps.map((step) => {
    if (step.action && !isKnownCapability(step.action)) {
      warnings.push(
        `Step "${step.label}" referenced unknown capability "${step.action}" — unbound. ` +
          `The compiler cannot promise a tool that does not exist.`,
      );
      return { ...step, action: null };
    }
    // apply default approval for irreversible actions unless the model set one
    if (step.action) {
      const atomic = getAtomic(step.action);
      const approval = step.approval ?? defaultApprovalFor(step.action);
      if (atomic?.irreversible && approval === 'auto') {
        warnings.push(
          `Step "${step.label}" is irreversible (${step.action}) — forcing require_approval.`,
        );
        return { ...step, approval: 'require_approval' as const };
      }
      return { ...step, approval };
    }
    return step;
  });

  // recompute prerequisites from the actual bound actions
  const neededProviders = new Set(
    steps.map((s) => s.integration).filter((p): p is string => !!p),
  );
  const prerequisites = [...neededProviders].map((provider) => ({
    provider,
    status: connected.has(provider)
      ? ('connected' as const)
      : ('supported_not_connected' as const),
  }));

  return {
    skill: { ...draft, steps, prerequisites },
    warnings,
  };
}
