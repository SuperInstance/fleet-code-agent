export type Temperature = 'hot' | 'warm' | 'cold';
export async function initWorkshop(wd: string): Promise<void> {
  const fs = await import('fs/promises'); const p = await import('path');
  for (const d of ['workshop/recipes','workshop/scripts','dojo','bootcamp','.agent'])
    await fs.mkdir(p.join(wd, d), { recursive: true });
}
export async function recordSession(wd: string, e: { action: string; details?: string; temperature?: Temperature }): Promise<void> {
  const fs = await import('fs/promises'); const p = await import('path');
  const lp = p.join(wd, '.agent/session-log.md');
  const t = e.temperature ? ' ['+e.temperature.toUpperCase()+']' : '';
  let ex = ''; try { ex = await fs.readFile(lp, 'utf-8'); } catch { ex = '# Session Log\n'; }
  await fs.writeFile(lp, ex + '\n## ' + new Date().toISOString() + t + '\n**' + e.action + '**\n' + (e.details||'') + '\n', 'utf-8');
}
