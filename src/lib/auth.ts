import { createClient } from './supabase/server';

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** One workspace per user for now (teams later). All data scopes to this. */
export async function getWorkspaceId(): Promise<string> {
  const user = await getUser();
  if (!user) throw new Error('unauthorized');
  return `ws_${user.id}`;
}
