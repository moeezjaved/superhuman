import 'dotenv/config';
import { Nango } from '@nangohq/node';
const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY });
try {
  const res = await nango.createConnectSession({ end_user: { id: 'ws_test' }, allowed_integrations: ['notion'] });
  console.log('✅ connect session created — token starts:', String(res?.data?.token || '').slice(0, 14) + '…');
  // also list configured integrations
  try { const ints = await nango.listIntegrations(); console.log('   integrations:', (ints?.configs || ints?.data || []).map(i => i.unique_key || i.provider_config_key || i.provider).join(', ')); } catch {}
} catch (e) {
  console.log('❌ ERROR:', e?.response?.data ? JSON.stringify(e.response.data) : (e.message || e));
}
