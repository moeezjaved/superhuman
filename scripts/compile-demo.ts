/**
 * Cortex — compiler demo (run it and watch a sentence become a runnable skill).
 *
 *   npm run compile "Every Monday 8am, summarize last week's Stripe payments and email me, flag failed ones"
 *   npm run compile   # uses the default example
 *
 * Requires ANTHROPIC_API_KEY in .env (or swap the model in src/lib/compiler.ts).
 */

import 'dotenv/config';
import { compileSkill } from '../src/lib/compiler';

const description =
  process.argv.slice(2).join(' ') ||
  "Every Monday morning, look at my Stripe payments and email me a summary of last week's revenue with any failed payments flagged.";

// pretend this workspace has connected Gmail + Dropbox (change to test prerequisites)
const connectedProviders = ['gmail', 'dropbox'];

function line(c = '─') {
  return c.repeat(72);
}

async function main() {
  console.log(line());
  console.log('COMPILING:', description);
  console.log(line());

  const { skill, warnings } = await compileSkill({ description, connectedProviders });

  console.log(`\n  ${skill.name}`);
  console.log(`  [${skill.category ?? 'no category'}]  ${skill.description}\n`);

  console.log('  TRIGGER:');
  console.log('   ', JSON.stringify(skill.trigger));

  console.log('\n  WHAT IT DOES:');
  skill.steps.forEach((s, i) => {
    const bits = [s.integration ?? '—'];
    if (s.action) bits.push(s.action);
    if (s.approval && s.approval !== 'auto') bits.push(`⚑ ${s.approval}`);
    if (s.wait) bits.push(`⏳ ${JSON.stringify(s.wait)}`);
    console.log(`    ${i + 1}. ${s.label}  (${bits.join(' · ')})`);
  });

  if (skill.prerequisites.length) {
    console.log('\n  PREREQUISITES:');
    skill.prerequisites.forEach((p) =>
      console.log(`    - ${p.provider}: ${p.status}`),
    );
  }

  console.log('\n  HOT_SECTION (the SOP the runtime follows):');
  console.log(
    skill.hot_section
      .split('\n')
      .map((l) => '    ' + l)
      .join('\n'),
  );

  if (warnings.length) {
    console.log('\n  ⚠ GOVERNANCE WARNINGS (code-enforced):');
    warnings.forEach((w) => console.log('    - ' + w));
  }

  console.log('\n' + line());
  console.log('Compiled ✔  — this Skill can now be saved, scheduled, and run.');
  console.log(line());
}

main().catch((e) => {
  console.error('Compile failed:', e);
  process.exit(1);
});
