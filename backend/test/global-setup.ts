import { execSync } from 'child_process';
import { loadTestEnv } from './load-test-env';

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
}

export default async function globalSetup(): Promise<void> {
  loadTestEnv();
  const backendDir = `${__dirname}/..`;
  const { host, port, user, password, database } = parseDbUrl(process.env.DATABASE_URL!);

  // Best-effort: create the test database if it doesn't exist yet. Ignored
  // on failure — it may already exist, or `createdb` may not be on PATH, in
  // which case `migrate deploy` below fails with a clearer error pointing at
  // backend/README.md's "Local dev database" setup.
  try {
    execSync(`createdb -h ${host} -p ${port} -U ${user} ${database}`, {
      env: { ...process.env, PGPASSWORD: password },
      stdio: 'ignore',
    });
  } catch {
    // already exists, most likely
  }

  execSync('npx prisma migrate deploy', { cwd: backendDir, env: process.env, stdio: 'inherit' });
  execSync('npx ts-node prisma/seed.ts', { cwd: backendDir, env: process.env, stdio: 'inherit' });
}
