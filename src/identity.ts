export interface AgentIdentity {
  id: string; name: string; rank: string; model: string;
  keeperUrl: string; scopes: string[]; onboardedAt: string;
  temperature: 'hot' | 'warm' | 'cold';
}
export function createIdentity(opts: any): AgentIdentity {
  return { id: opts.id, name: opts.name, rank: 'greenhorn', model: opts.model || 'glm-5',
    keeperUrl: opts.keeperUrl, scopes: [], onboardedAt: new Date().toISOString(),
    temperature: opts.temperature || 'warm' };
}
export async function loadIdentity(wd: string): Promise<AgentIdentity | null> {
  try { const fs = await import('fs/promises'); const p = await import('path');
    return JSON.parse(await fs.readFile(p.join(wd, '.agent/identity.json'), 'utf-8')); }
  catch { return null; }
}
export async function saveIdentity(wd: string, id: AgentIdentity): Promise<void> {
  const fs = await import('fs/promises'); const p = await import('path');
  await fs.mkdir(p.join(wd, '.agent'), { recursive: true });
  await fs.writeFile(p.join(wd, '.agent/identity.json'), JSON.stringify(id, null, 2), 'utf-8');
}
