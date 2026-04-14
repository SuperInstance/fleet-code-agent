import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { initWorkshop, recordSession, Temperature } from './workshop.js';

let td: string;

beforeEach(async () => {
  td = await fs.mkdtemp(path.join(os.tmpdir(), 'workshop-test-'));
});

afterEach(async () => {
  await fs.rm(td, { recursive: true, force: true });
});

// ─── initWorkshop ─────────────────────────────────────────────────
describe('initWorkshop', () => {
  it('creates workshop/recipes directory', async () => {
    await initWorkshop(td);
    const stat = await fs.stat(path.join(td, 'workshop/recipes'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('creates workshop/scripts directory', async () => {
    await initWorkshop(td);
    const stat = await fs.stat(path.join(td, 'workshop/scripts'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('creates dojo directory', async () => {
    await initWorkshop(td);
    const stat = await fs.stat(path.join(td, 'dojo'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('creates bootcamp directory', async () => {
    await initWorkshop(td);
    const stat = await fs.stat(path.join(td, 'bootcamp'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('creates .agent directory', async () => {
    await initWorkshop(td);
    const stat = await fs.stat(path.join(td, '.agent'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('is idempotent (running twice does not throw)', async () => {
    await initWorkshop(td);
    await expect(initWorkshop(td)).resolves.toBeUndefined();
  });

  it('returns void/undefined', async () => {
    const result = await initWorkshop(td);
    expect(result).toBeUndefined();
  });
});

// ─── recordSession ────────────────────────────────────────────────
describe('recordSession', () => {
  it('creates .agent/session-log.md with header when it does not exist', async () => {
    await initWorkshop(td);
    await recordSession(td, { action: 'TEST' });
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('# Session Log');
  });

  it('appends an entry with the action', async () => {
    await initWorkshop(td);
    await recordSession(td, { action: 'ONBOARDED' });
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('ONBOARDED');
  });

  it('includes details in the entry', async () => {
    await initWorkshop(td);
    await recordSession(td, { action: 'BUILD', details: 'Compiled successfully' });
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('Compiled successfully');
  });

  it('includes temperature tag for "hot"', async () => {
    await initWorkshop(td);
    await recordSession(td, { action: 'HOT_ACTION', temperature: 'hot' });
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('[HOT]');
  });

  it('includes temperature tag for "warm"', async () => {
    await initWorkshop(td);
    await recordSession(td, { action: 'WARM_ACTION', temperature: 'warm' });
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('[WARM]');
  });

  it('includes temperature tag for "cold"', async () => {
    await initWorkshop(td);
    await recordSession(td, { action: 'COLD_ACTION', temperature: 'cold' });
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('[COLD]');
  });

  it('omits temperature tag when not provided', async () => {
    await initWorkshop(td);
    await recordSession(td, { action: 'NO_TEMP' });
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).not.toContain('[HOT]');
    expect(content).not.toContain('[WARM]');
    expect(content).not.toContain('[COLD]');
  });

  it('includes ISO timestamp in the entry', async () => {
    await initWorkshop(td);
    const before = new Date().toISOString();
    await recordSession(td, { action: 'TIMED' });
    const after = new Date().toISOString();
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    const match = content.match(/## (\S+)/);
    expect(match).not.toBeNull();
    const ts = new Date(match![1]).getTime();
    expect(ts).toBeGreaterThanOrEqual(new Date(before).getTime() - 1000);
    expect(ts).toBeLessThanOrEqual(new Date(after).getTime() + 1000);
  });

  it('appends multiple sessions to the same log', async () => {
    await initWorkshop(td);
    await recordSession(td, { action: 'FIRST' });
    await recordSession(td, { action: 'SECOND' });
    await recordSession(td, { action: 'THIRD' });
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('FIRST');
    expect(content).toContain('SECOND');
    expect(content).toContain('THIRD');
    const firstIdx = content.indexOf('FIRST');
    const secondIdx = content.indexOf('SECOND');
    const thirdIdx = content.indexOf('THIRD');
    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  it('uses markdown heading for entries', async () => {
    await initWorkshop(td);
    await recordSession(td, { action: 'HEADING' });
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('## ');
  });

  it('handles empty details gracefully', async () => {
    await initWorkshop(td);
    await expect(recordSession(td, { action: 'EMPTY', details: '' })).resolves.toBeUndefined();
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('EMPTY');
  });

  it('handles missing details gracefully', async () => {
    await initWorkshop(td);
    await expect(recordSession(td, { action: 'NO_DETAILS' })).resolves.toBeUndefined();
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('NO_DETAILS');
  });

  it('returns void/undefined', async () => {
    await initWorkshop(td);
    const result = await recordSession(td, { action: 'VOID' });
    expect(result).toBeUndefined();
  });

  it('rejects when .agent directory does not exist', async () => {
    await expect(recordSession(td, { action: 'NO_DIR' })).rejects.toThrow();
  });

  it('handles unicode in action and details', async () => {
    await initWorkshop(td);
    await recordSession(td, { action: '日本語テスト', details: ' emojis 🚢⚓' });
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('日本語テスト');
    expect(content).toContain('🚢⚓');
  });
});
