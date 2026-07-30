/**
 * Cortex — full loop demo: compile a sentence into a Skill, then RUN it.
 *
 *   npm run run:skill "Find 3 leads on LinkedIn and send each a connection request"
 *   npm run run:skill                 # default: refund handler (shows a wait + approval gate)
 *   REJECT=1 npm run run:skill        # reject at the approval gate to see the run stop safely
 *
 * Stubbed tool execution (no real side effects) so you see the whole run trace.
 */

import 'dotenv/config';
import { compileSkill } from '../src/lib/compiler';
import { executeRun, type RunEvent } from '../src/lib/run-engine';
import { StubToolExecutor } from '../src/lib/tools';
import type { ApprovalRequest } from '../src/lib/types';

const description =
  process.argv.slice(2).join(' ') ||
  'When a customer emails asking for a refund, check if their order was in the last 30 days, draft an approval or a polite decline, and if they don’t reply in 3 days follow up once.';

const connectedProviders = ['gmail', 'dropbox', 'linkedin'];
const REJECT = process.env.REJECT === '1';

const rule = (c = '─') => c.repeat(72);

async function main() {
  console.log(rule('═'));
  console.log('1) COMPILE:', description);
  console.log(rule());
  const { skill } = await compileSkill({ description, connectedProviders });
  console.log(`   ${skill.name}  [${skill.category ?? 'none'}]`);
  console.log(`   trigger: ${JSON.stringify(skill.trigger)}`);
  skill.steps.forEach((s, i) =>
    console.log(
      `   ${i + 1}. ${s.label}` +
        (s.action ? `  ·${s.action}` : '') +
        (s.approval && s.approval !== 'auto' ? `  ⚑${s.approval}` : '') +
        (s.wait ? `  ⏳wait` : ''),
    ),
  );

  console.log('\n' + rule('═'));
  console.log(`2) RUN  (trigger fires → durable execution)   ${REJECT ? '[will REJECT at gate]' : ''}`);
  console.log(rule());

  const onEvent = (e: RunEvent) => {
    const icon =
      e.type === 'awaiting_approval'
        ? '  ⚑ APPROVAL NEEDED →'
        : e.type === 'approved'
          ? '  ✅'
          : e.type === 'rejected'
            ? '  ⛔'
            : e.type === 'waiting'
              ? '  ⏳'
              : e.type === 'run_finished'
                ? '  ■'
                : '   ·';
    console.log(`${icon} ${e.message}`);
  };

  // The approval gate: in the real app this renders the confirmation card and
  // waits (durably) for the user. Here we auto-decide.
  const approve = async (req: ApprovalRequest): Promise<'approved' | 'rejected'> => {
    console.log(`       ┌─ confirmation card ─ "${req.summary}" (${req.action})`);
    return REJECT ? 'rejected' : 'approved';
  };

  const run = await executeRun(skill, {
    workspaceId: 'ws_demo',
    executor: new StubToolExecutor(),
    approve,
    onEvent,
    simulateWaits: true,
  });

  console.log('\n' + rule('═'));
  console.log('3) RUN TRACE  (the audit trail LemonLime has none of)');
  console.log(rule());
  console.log(`   status: ${run.status.toUpperCase()}   hoursSaved≈${run.hoursSaved ?? 0}   cost=$${run.costUsd ?? 0}`);
  run.steps.forEach((s) => {
    const mark =
      s.status === 'succeeded' ? '✓' : s.status === 'canceled' ? '⛔' : s.status === 'failed' ? '✗' : '…';
    console.log(
      `   ${mark} [${s.status}] ${s.ord}. ${s.label}` +
        (s.diff ? `  → ${s.diff}` : '') +
        (s.latencyMs != null ? `  (${s.latencyMs}ms)` : ''),
    );
  });
  console.log(rule('═'));
}

main().catch((e) => {
  console.error('Demo failed:', e);
  process.exit(1);
});
