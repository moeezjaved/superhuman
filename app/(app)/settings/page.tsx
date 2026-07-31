import { getUser } from '@/lib/auth';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getUser().catch(() => null);
  return <SettingsClient email={user?.email ?? 'you@yourcompany.com'} />;
}
