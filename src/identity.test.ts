import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createIdentity, loadIdentity, saveIdentity, AgentIdentity, Temperature } from './identity.js';

let td: string;

beforeEach(async () => {
  td = await fs.mkdtemp(path.join(os.tmpdir(), 'identity-test-'));
});

afterEach(async () => {
  await fs.rm(td, { recursive: true, force: true });
});

// ─── createIdentity ───────────────────────────────────────────────
describe('createIdentity', () => {
  it('creates identity with required fields', () => {
    const identity = createIdentity({ id: 'agent-1', name: 'TestBot', keeperUrl: 'https://keeper.test' });
    expect(identity.id).toBe('agent-1');
    expect(identity.name).toBe('TestBot');
    expect(identity.keeperUrl).toBe('https://keeper.test');
  });

  it('defaults model to "glm-5"', () => {
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u' });
    expect(identity.model).toBe('glm-5');
  });

  it('accepts a custom model', () => {
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u', model: 'gpt-4' });
    expect(identity.model).toBe('gpt-4');
  });

  it('defaults temperature to "warm"', () => {
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u' });
    expect(identity.temperature).toBe('warm');
  });

  it('accepts temperature "hot"', () => {
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u', temperature: 'hot' });
    expect(identity.temperature).toBe('hot');
  });

  it('accepts temperature "cold"', () => {
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u', temperature: 'cold' });
    expect(identity.temperature).toBe('cold');
  });

  it('defaults rank to "greenhorn"', () => {
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u' });
    expect(identity.rank).toBe('greenhorn');
  });

  it('defaults scopes to empty array', () => {
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u' });
    expect(identity.scopes).toEqual([]);
  });

  it('sets onboardedAt to a valid ISO string', () => {
    const before = new Date().toISOString();
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u' });
    const after = new Date().toISOString();
    expect(identity.onboardedAt).toBeDefined();
    const ts = new Date(identity.onboardedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(new Date(before).getTime());
    expect(ts).toBeLessThanOrEqual(new Date(after).getTime());
  });

  it('handles empty string id and name', () => {
    const identity = createIdentity({ id: '', name: '', keeperUrl: '' });
    expect(identity.id).toBe('');
    expect(identity.name).toBe('');
    expect(identity.keeperUrl).toBe('');
  });

  it('handles unicode characters in name', () => {
    const identity = createIdentity({ id: 'a', name: '🤖 Fleet-Bot 太郎', keeperUrl: 'u' });
    expect(identity.name).toBe('🤖 Fleet-Bot 太郎');
  });

  it('handles very long strings', () => {
    const longStr = 'x'.repeat(10000);
    const identity = createIdentity({ id: longStr, name: longStr, keeperUrl: longStr });
    expect(identity.id.length).toBe(10000);
    expect(identity.name.length).toBe(10000);
  });

  it('ignores extra properties passed in opts', () => {
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u', extra: 'ignored' } as any);
    expect((identity as any).extra).toBeUndefined();
  });

  it('returns object conforming to AgentIdentity interface', () => {
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u' });
    const keys: (keyof AgentIdentity)[] = ['id', 'name', 'rank', 'model', 'keeperUrl', 'scopes', 'onboardedAt', 'temperature'];
    for (const key of keys) {
      expect(identity).toHaveProperty(key);
    }
  });
});

// ─── saveIdentity ─────────────────────────────────────────────────
describe('saveIdentity', () => {
  it('creates .agent directory if it does not exist', async () => {
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u' });
    await saveIdentity(td, identity);
    const stat = await fs.stat(path.join(td, '.agent'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('writes a valid JSON file to .agent/identity.json', async () => {
    const identity = createIdentity({ id: 'save-test', name: 'Saver', keeperUrl: 'https://k.test' });
    await saveIdentity(td, identity);
    const raw = await fs.readFile(path.join(td, '.agent/identity.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.id).toBe('save-test');
    expect(parsed.name).toBe('Saver');
  });

  it('writes pretty-printed JSON (indented)', async () => {
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u' });
    await saveIdentity(td, identity);
    const raw = await fs.readFile(path.join(td, '.agent/identity.json'), 'utf-8');
    expect(raw).toContain('  '); // has indentation
    expect(raw.split('\n').length).toBeGreaterThan(1);
  });

  it('overwrites existing identity file', async () => {
    const id1 = createIdentity({ id: 'first', name: 'First', keeperUrl: 'u1' });
    const id2 = createIdentity({ id: 'second', name: 'Second', keeperUrl: 'u2' });
    await saveIdentity(td, id1);
    await saveIdentity(td, id2);
    const loaded = await loadIdentity(td);
    expect(loaded!.id).toBe('second');
  });

  it('does not throw when .agent directory already exists', async () => {
    await fs.mkdir(path.join(td, '.agent'));
    const identity = createIdentity({ id: 'a', name: 'N', keeperUrl: 'u' });
    await expect(saveIdentity(td, identity)).resolves.toBeUndefined();
  });
});

// ─── loadIdentity ─────────────────────────────────────────────────
describe('loadIdentity', () => {
  it('returns null when .agent/identity.json does not exist', async () => {
    const result = await loadIdentity(td);
    expect(result).toBeNull();
  });

  it('returns null when .agent directory does not exist', async () => {
    const result = await loadIdentity(td);
    expect(result).toBeNull();
  });

  it('loads and parses saved identity correctly', async () => {
    const identity = createIdentity({ id: 'roundtrip', name: 'RoundTrip', keeperUrl: 'https://rt.test', model: 'glm-4' });
    await saveIdentity(td, identity);
    const loaded = await loadIdentity(td);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('roundtrip');
    expect(loaded!.name).toBe('RoundTrip');
    expect(loaded!.keeperUrl).toBe('https://rt.test');
    expect(loaded!.model).toBe('glm-4');
  });

  it('returns null for malformed JSON', async () => {
    await fs.mkdir(path.join(td, '.agent'), { recursive: true });
    await fs.writeFile(path.join(td, '.agent/identity.json'), 'NOT VALID JSON{{{', 'utf-8');
    const result = await loadIdentity(td);
    expect(result).toBeNull();
  });

  it('returns null for empty file', async () => {
    await fs.mkdir(path.join(td, '.agent'), { recursive: true });
    await fs.writeFile(path.join(td, '.agent/identity.json'), '', 'utf-8');
    const result = await loadIdentity(td);
    expect(result).toBeNull();
  });

  it('preserves all identity fields on roundtrip', async () => {
    const original = createIdentity({ id: 'full', name: 'FullBot', keeperUrl: 'https://f.test', model: 'custom-model', temperature: 'hot' });
    await saveIdentity(td, original);
    const loaded = (await loadIdentity(td))!;
    expect(loaded.id).toBe(original.id);
    expect(loaded.name).toBe(original.name);
    expect(loaded.rank).toBe(original.rank);
    expect(loaded.model).toBe(original.model);
    expect(loaded.keeperUrl).toBe(original.keeperUrl);
    expect(loaded.scopes).toEqual(original.scopes);
    expect(loaded.temperature).toBe(original.temperature);
    expect(loaded.onboardedAt).toBe(original.onboardedAt);
  });
});
