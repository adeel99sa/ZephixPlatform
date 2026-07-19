/**
 * ATOMICITY-1 (4.4) — REAL two-connection proof for workspace ownership sync.
 *
 * The defect: changeOwner() wrote workspaces.owner_id and the workspace_members
 * owner row in sequential, untransactioned saves — a crash between them (or a
 * race) left an owner_id with no matching owner row. The fix binds both writes
 * in one transaction under a pessimistic_write lock on the workspace row.
 *
 * This fires TWO concurrent changeOwner() calls (different new owners) at the
 * same workspace, each in its own transaction/connection. The lock serializes
 * them; whichever commits last wins, but the invariant that MUST hold either
 * way: workspaces.owner_id === the single workspace_owner member row's user.
 * They can never be left disagreeing (the divergence being reconciled).
 *
 * The transactional entities (Workspace, WorkspaceMember) use real repos; the
 * non-critical user/org validation reads are stubbed — the concurrency-critical
 * writes are what this proves. Skips if Postgres is unreachable.
 */
import { DataSource } from 'typeorm';
import { WorkspaceMembersService } from '../workspace-members.service';
import { Workspace } from '../../entities/workspace.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { TenantAwareRepository } from '../../../tenancy/tenant-aware.repository';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `atom1_owner_${Date.now()}`;

const ORG = '11111111-1111-1111-1111-111111111111';
const WS = 'aaaaaaaa-0000-0000-0000-000000000001';
const ACTOR = '00000000-0000-0000-0000-0000000000ad';
const OWNER_X = '00000000-0000-0000-0000-0000000000f1';
const OWNER_Y = '00000000-0000-0000-0000-0000000000f2';

describe('ATOMICITY-1 — changeOwner ownership-sync race (real schema)', () => {
  let adminDS: DataSource | null = null;
  let testDS: DataSource | null = null;
  let svc: WorkspaceMembersService | null = null;
  let dbReady = false;

  beforeAll(async () => {
    adminDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: 'postgres',
    });
    try {
      await adminDS.initialize();
      await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
      await adminDS.query(`CREATE DATABASE "${TEST_DB}"`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[ATOMICITY-1 owner] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
      entities: [__dirname + '/../../../../**/*.entity{.ts,.js}'],
      synchronize: false,
    });
    await testDS.initialize();
    await testDS.query(`CREATE TABLE workspaces (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, name varchar(200),
      slug varchar(200), description text, is_private boolean DEFAULT false,
      created_by uuid, owner_id uuid, permissions_config jsonb,
      default_methodology varchar(50), home_notes text, dashboard_config jsonb,
      complexity_mode varchar(20) DEFAULT 'lean',
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
      deleted_by uuid, deleted_at timestamptz )`);
    await testDS.query(`CREATE TABLE workspace_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
      user_id uuid NOT NULL, role varchar(40) NOT NULL, organization_id uuid,
      status varchar(20) DEFAULT 'active',
      created_by uuid, updated_by uuid, suspended_by_user_id uuid,
      reinstated_by_user_id uuid, suspended_at timestamptz, reinstated_at timestamptz,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )`);

    const tenantCtx: any = {
      assertOrganizationId: () => ORG,
      getOrganizationId: () => ORG,
      getWorkspaceId: () => null,
    };
    const wsRepo = new TenantAwareRepository(
      testDS.getRepository(Workspace), tenantCtx, Workspace,
    );
    const wmRepo = new TenantAwareRepository(
      testDS.getRepository(WorkspaceMember), tenantCtx, WorkspaceMember,
    );
    // Non-critical validation reads: any candidate owner "exists" + is an active
    // org member. The concurrency-critical writes use the real repos above.
    const userRepo: any = { findOneBy: async () => ({ id: 'u' }) };
    const userOrgRepo: any = { findOne: async () => ({ userId: 'u', isActive: true }) };
    const stub: any = {};
    svc = new WorkspaceMembersService(
      wmRepo as any, wsRepo as any, userRepo, userOrgRepo,
      { track: async () => undefined } as any, // events
      stub, tenantCtx, stub, stub, // accessService, tenantContextService, notificationDispatch, auditService
    );
    dbReady = true;
  });

  afterAll(async () => {
    if (testDS?.isInitialized) await testDS.destroy();
    if (adminDS?.isInitialized) {
      await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
      await adminDS.destroy();
    }
  });

  async function seedWorkspace(initialOwner: string): Promise<void> {
    await testDS!.query(`DELETE FROM workspace_members WHERE workspace_id=$1`, [WS]);
    await testDS!.query(`DELETE FROM workspaces WHERE id=$1`, [WS]);
    await testDS!.query(
      `INSERT INTO workspaces (id, organization_id, name, owner_id) VALUES ($1,$2,'WS',$3)`,
      [WS, ORG, initialOwner],
    );
    await testDS!.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, organization_id, status)
       VALUES ($1,$2,'workspace_owner',$3,'active')`,
      [WS, initialOwner, ORG],
    );
  }

  const actor = { id: ACTOR, orgRole: 'admin' as any };

  it('two concurrent owner changes leave owner_id CONSISTENT with the owner member row', async () => {
    if (!dbReady) return; // Postgres unreachable — skipped
    await seedWorkspace(ACTOR);

    await Promise.allSettled([
      svc!.changeOwner(WS, OWNER_X, actor),
      svc!.changeOwner(WS, OWNER_Y, actor),
    ]);

    const [ws] = await testDS!.query(`SELECT owner_id FROM workspaces WHERE id=$1`, [WS]);
    const owners = await testDS!.query(
      `SELECT user_id FROM workspace_members WHERE workspace_id=$1 AND role='workspace_owner'`,
      [WS],
    );
    // Exactly one owner member row, and it names the SAME user as owner_id.
    expect(owners).toHaveLength(1);
    expect(ws.owner_id).toBe(owners[0].user_id);
    // And the winner is one of the two contenders — not a torn state.
    expect([OWNER_X, OWNER_Y]).toContain(ws.owner_id);
  });

  it('single change: owner_id and the owner member row are written together', async () => {
    if (!dbReady) return;
    await seedWorkspace(ACTOR);

    await svc!.changeOwner(WS, OWNER_X, actor);

    const [ws] = await testDS!.query(`SELECT owner_id FROM workspaces WHERE id=$1`, [WS]);
    const owners = await testDS!.query(
      `SELECT user_id FROM workspace_members WHERE workspace_id=$1 AND role='workspace_owner'`,
      [WS],
    );
    expect(ws.owner_id).toBe(OWNER_X);
    expect(owners).toHaveLength(1);
    expect(owners[0].user_id).toBe(OWNER_X);
  });
});
