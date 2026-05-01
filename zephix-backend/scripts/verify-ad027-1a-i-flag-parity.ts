/**
 * LOCAL / MANUAL ONLY — NOT run in CI, npm test, or automated pipelines.
 *
 * One-time differential evidence for AD-027 batch 1a-i (Approach J):
 * compares HTTP status codes for `memberNoWorkspace` across workspace read
 * routes for a single flag state per process.
 *
 * Run TWICE (separate shell invocations) and diff or paste both outputs:
 *
 *   cd zephix-backend
 *   export DATABASE_URL=postgresql://...
 *   export JWT_SECRET=$(openssl rand -hex 32)
 *   export JWT_REFRESH_SECRET=$(openssl rand -hex 32)
 *   export REFRESH_TOKEN_PEPPER=$(openssl rand -hex 32)
 *   export INTEGRATION_ENCRYPTION_KEY=$(openssl rand -hex 32)
 *   export REDIS_URL=redis://127.0.0.1:6379
 *   export NODE_ENV=test
 *   export ZEPHIX_RESOURCE_AI_RISK_SCORING_V1=true
 *
 *   # Canonical (flag ON)
 *   ZEPHIX_WS_MEMBERSHIP_V1=1 npx ts-node -r tsconfig-paths/register scripts/verify-ad027-1a-i-flag-parity.ts
 *
 *   # Transitional (flag OFF)
 *   env -u ZEPHIX_WS_MEMBERSHIP_V1 npx ts-node -r tsconfig-paths/register scripts/verify-ad027-1a-i-flag-parity.ts
 *
 * Prerequisites: migrations applied (`npm run db:migrate`), Postgres + Redis reachable.
 * If the process hangs, ensure clean shutdown of prior Node processes and DB pool.
 */

import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { PermissionMatrixFixtures } from '../test/permission-matrix/fixtures';
import {
  bootstrapWorkspaceReadsApp,
  closeWorkspaceReadsApp,
} from '../test/permission-matrix/__tests__/workspaces-controller-reads.bootstrap';

const RISK_QUERY =
  'dateFrom=2024-01-01&dateTo=2024-12-31&limit=10';

function requireEnv(name: string): void {
  const v = process.env[name];
  if (!v || String(v).trim() === '') {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

async function probeGet(
  app: INestApplication,
  path: string,
  token: string,
): Promise<{ path: string; status: number }> {
  const res = await request(app.getHttpServer())
    .get(path)
    .set('Authorization', `Bearer ${token}`);
  return { path, status: res.status };
}

async function collectRows(
  app: INestApplication,
  f: PermissionMatrixFixtures,
): Promise<Array<{ path: string; status: number }>> {
  const token = f.tokens.memberNoWorkspace;
  const rows: Array<{ path: string; status: number }> = [];

  rows.push(
    await probeGet(
      app,
      `/api/workspaces/${f.workspaceA1.id}`,
      token,
    ),
  );
  rows.push(
    await probeGet(
      app,
      `/api/workspaces/resolve/${encodeURIComponent(f.workspaceA1.slug)}`,
      token,
    ),
  );
  rows.push(
    await probeGet(
      app,
      `/api/workspaces/slug/${encodeURIComponent(f.workspaceA1.slug)}`,
      token,
    ),
  );
  rows.push(
    await probeGet(
      app,
      `/api/workspaces/slug/${encodeURIComponent(f.workspaceA1.slug)}/home`,
      token,
    ),
  );
  rows.push(
    await probeGet(
      app,
      `/api/workspaces/${f.workspaceA1.id}/settings`,
      token,
    ),
  );
  rows.push(
    await probeGet(
      app,
      `/api/workspaces/${f.workspaceA1.id}/dashboard-config`,
      token,
    ),
  );
  rows.push(
    await probeGet(
      app,
      `/api/workspaces/${f.workspaceA1.id}/role`,
      token,
    ),
  );
  rows.push(
    await probeGet(
      app,
      `/api/workspaces/${f.workspaceA1.id}/summary`,
      token,
    ),
  );
  rows.push(
    await probeGet(
      app,
      `/api/workspaces/${f.workspaceA1.id}/members`,
      token,
    ),
  );
  rows.push(
    await probeGet(
      app,
      `/api/workspaces/${f.workspaceA1.id}/invite-link`,
      token,
    ),
  );
  rows.push(
    await probeGet(
      app,
      `/api/workspaces/${f.workspaceA1.id}/resource-risk-summary?${RISK_QUERY}`,
      token,
    ),
  );

  return rows;
}

async function main(): Promise<void> {
  requireEnv('DATABASE_URL');
  requireEnv('JWT_SECRET');
  requireEnv('JWT_REFRESH_SECRET');
  requireEnv('REFRESH_TOKEN_PEPPER');
  requireEnv('INTEGRATION_ENCRYPTION_KEY');
  const iek = process.env.INTEGRATION_ENCRYPTION_KEY!;
  if (iek.length < 32) {
    console.error('INTEGRATION_ENCRYPTION_KEY must be at least 32 characters');
    process.exit(1);
  }

  const flagLabel =
    process.env.ZEPHIX_WS_MEMBERSHIP_V1 === '1' ? 'FLAG_ON' : 'FLAG_OFF';

  console.error(
    `# verify-ad027-1a-i-flag-parity run=${flagLabel} ZEPHIX_WS_MEMBERSHIP_V1=${process.env.ZEPHIX_WS_MEMBERSHIP_V1 ?? 'unset'}`,
  );

  const { app, fixtures } = await bootstrapWorkspaceReadsApp();
  try {
    console.log(`flag\tpath\tstatus`);
    const rows = await collectRows(app, fixtures);
    for (const r of rows) {
      console.log(`${flagLabel}\t${r.path}\t${r.status}`);
    }
  } finally {
    await closeWorkspaceReadsApp(app);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
