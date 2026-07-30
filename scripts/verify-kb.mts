import 'dotenv/config';
import { ingestText, retrieve } from '../src/lib/knowledge.js';
const n = await ingestText('cortex-doc', 'Cortex is an AI operations platform for small businesses. It compiles plain-English requests into skills that run on a schedule, with enforced approval gates and full run history. It supports WhatsApp and LinkedIn outreach via Unipile.', 'ws_kbtest');
console.log('ingested chunks:', n);
const hits = await retrieve('what channels does it support for outreach', 3, 'ws_kbtest');
console.log('pgvector retrieval:');
for (const h of hits) console.log('  score', h.score.toFixed(3), '|', h.text.slice(0, 70));
process.exit(0);
