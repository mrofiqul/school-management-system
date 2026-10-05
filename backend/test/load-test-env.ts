import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Minimal, dependency-free ".env.test" loader. Only has to handle the
 * simple KEY="value" / KEY=value lines we actually write there — not full
 * dotenv syntax. Never overwrites a var the environment already set, so
 * CI can still override individual values.
 */
export function loadTestEnv(): void {
  const path = join(__dirname, '..', '.env.test');
  const contents = readFileSync(path, 'utf8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
