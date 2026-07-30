import { q } from './db';
export interface Connection { id: string; workspaceId: string; provider: string; connectionId: string; createdAt: string; }
let _n = 0;
const nid = () => `conn_${Date.now().toString(36)}${(_n++).toString(36)}`;

export async function saveConnection(workspaceId: string, provider: string, connectionId: string) {
  await q(`insert into connections (id, workspace_id, provider, connection_id) values ($1,$2,$3,$4)
           on conflict (workspace_id, provider) do update set connection_id=excluded.connection_id, created_at=now()`,
    [nid(), workspaceId, provider, connectionId]);
}
export async function listConnections(workspaceId: string): Promise<Connection[]> {
  return q<Connection>(`select id, workspace_id as "workspaceId", provider, connection_id as "connectionId", created_at as "createdAt" from connections where workspace_id=$1 order by created_at desc`, [workspaceId]);
}
export async function connectedProviders(workspaceId: string): Promise<string[]> {
  const rows = await q<{ provider: string }>(`select provider from connections where workspace_id=$1`, [workspaceId]);
  return rows.map((r) => r.provider);
}
