import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

let td: string;

beforeEach(async () => {
  td = await fs.mkdtemp(path.join(os.tmpdir(), 'index-test-'));
});

afterEach(async () => {
  await fs.rm(td, { recursive: true, force: true });
});

// ─── CLI Integration Tests ────────────────────────────────────────
describe('CLI', () => {
  function runAgent(args: string[], cwd?: string) {
    return execFileAsync('npx', ['tsx', path.join('/tmp/fleet-code-agent/src/index.ts'), ...args], {
      cwd: cwd || td,
      timeout: 10000,
      env: { ...process.env },
    });
  }

  it('prints usage when no arguments are given', async () => {
    const { stdout } = await runAgent([]);
    expect(stdout).toContain('fleet-code-agent');
  });

  it('prints usage for unknown commands', async () => {
    const { stdout } = await runAgent(['--unknown-command']);
    expect(stdout).toContain('fleet-code-agent');
  });

  it('prints onboarded message with agent name', async () => {
    const { stdout } = await runAgent([
      '--onboard', '--keeper-url', 'https://keeper.test', '--id', 'cli-1', '--name', 'CLIBot',
    ]);
    expect(stdout).toContain('CLIBot');
    expect(stdout).toContain('onboarded');
  });

  it('prints default warm mode in onboard output', async () => {
    const { stdout } = await runAgent([
      '--onboard', '--keeper-url', 'https://k.test', '--id', 'w1', '--name', 'WarmBot',
    ]);
    expect(stdout).toContain('warm');
  });

  it('prints hot mode when --temp hot is specified', async () => {
    const { stdout } = await runAgent([
      '--onboard', '--keeper-url', 'https://k.test', '--id', 'h1', '--name', 'HotBot', '--temp', 'hot',
    ]);
    expect(stdout).toContain('hot');
  });

  it('prints cold mode when --temp cold is specified', async () => {
    const { stdout } = await runAgent([
      '--onboard', '--keeper-url', 'https://k.test', '--id', 'c1', '--name', 'ColdBot', '--temp', 'cold',
    ]);
    expect(stdout).toContain('cold');
  });

  it('creates .agent/identity.json on --onboard', async () => {
    await runAgent([
      '--onboard', '--keeper-url', 'https://k.test', '--id', 'f1', '--name', 'FileBot',
    ]);
    const raw = await fs.readFile(path.join(td, '.agent/identity.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.id).toBe('f1');
    expect(parsed.name).toBe('FileBot');
  });

  it('creates workshop directories on --onboard', async () => {
    await runAgent([
      '--onboard', '--keeper-url', 'https://k.test', '--id', 'w1', '--name', 'WorkshopBot',
    ]);
    const dirs = ['workshop/recipes', 'workshop/scripts', 'dojo', 'bootcamp'];
    for (const d of dirs) {
      const stat = await fs.stat(path.join(td, d));
      expect(stat.isDirectory()).toBe(true);
    }
  });

  it('creates session log on --onboard', async () => {
    await runAgent([
      '--onboard', '--keeper-url', 'https://k.test', '--id', 's1', '--name', 'SessionBot',
    ]);
    const content = await fs.readFile(path.join(td, '.agent/session-log.md'), 'utf-8');
    expect(content).toContain('ONBOARDED');
  });

  it('shows usage when --onboard is missing required --keeper-url', async () => {
    const { stdout } = await runAgent(['--onboard', '--id', 'x', '--name', 'X']);
    expect(stdout).toContain('Usage');
  });

  it('shows usage when --onboard is missing required --name', async () => {
    const { stdout } = await runAgent(['--onboard', '--keeper-url', 'https://k.test', '--id', 'x']);
    expect(stdout).toContain('Usage');
  });

  it('--work prints task name', async () => {
    const { stdout } = await runAgent(['--work', 'fix-bug-123']);
    expect(stdout).toContain('fix-bug-123');
  });

  it('--work shows "(none)" when no task is provided', async () => {
    const { stdout } = await runAgent(['--work']);
    expect(stdout).toContain('(none)');
  });

  it('--work with flags but no task shows "(none)"', async () => {
    const { stdout } = await runAgent(['--work', '--verbose']);
    expect(stdout).toContain('(none)');
  });
});
