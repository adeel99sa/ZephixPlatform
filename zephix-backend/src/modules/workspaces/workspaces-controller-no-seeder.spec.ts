/**
 * Phase 4.7.3 — workspace creation truthfulness lock (BEHAVIORAL).
 *
 * Non-negotiable: default workspace creation MUST produce an EMPTY workspace —
 * no silent sample-project seeding. The canonical path is svc.createWithOwners,
 * which creates the workspace and nothing else.
 *
 * EX-1 (R3): the previous version grepped the controller SOURCE for a comment
 * string ("a lint rule in a costume" — it went red the moment the comment was
 * reworded). Replaced with a real behavioral test: drive the create handler and
 * assert it delegates to the empty-workspace path and returns a workspace with
 * no project. The sample seeder is not injected into this controller at all —
 * there is nothing for it to call.
 */
import { WorkspacesController } from './workspaces.controller';

describe('Phase 4.7.3 — workspace create yields an empty workspace (no seeding)', () => {
  const OLD_ENV = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = 'test'; // non-production → the create path runs createWithOwners
  });
  afterAll(() => {
    process.env.NODE_ENV = OLD_ENV;
  });

  function buildController() {
    const createdWorkspace = {
      id: 'ws-1',
      name: 'My Workspace',
      slug: 'my-workspace',
      isPrivate: false,
    };
    const svc = { createWithOwners: jest.fn().mockResolvedValue(createdWorkspace) };
    const notificationDispatch = { dispatch: jest.fn().mockResolvedValue(undefined) };
    const auditService = { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) };
    const ctrl = new WorkspacesController(
      svc as any,
      {} as any, // members
      {} as any, // policy
      {} as any, // accessService
      {} as any, // riskScoreService
      {} as any, // responseService
      {} as any, // inviteService
      {} as any, // workspaceHealthService
      {} as any, // tenantContextService
      notificationDispatch as any,
      auditService as any,
    );
    return { ctrl, svc, createdWorkspace };
  }

  const admin = { id: 'u1', organizationId: 'o1', role: 'admin', platformRole: 'ADMIN' };
  const req = { headers: {} } as any;

  it('delegates to the empty-workspace path (createWithOwners) and creates no project', async () => {
    const { ctrl, svc } = buildController();

    await ctrl.create({ name: 'My Workspace' } as any, admin as any, req, {} as any);

    // The ONLY creation call is the empty-workspace one.
    expect(svc.createWithOwners).toHaveBeenCalledTimes(1);
    const payload = svc.createWithOwners.mock.calls[0][0];
    expect(payload).toMatchObject({ name: 'My Workspace', organizationId: 'o1' });
    // No project/seed directive is ever forwarded.
    expect(payload).not.toHaveProperty('projectId');
    expect(payload).not.toHaveProperty('templateId');
    expect(payload).not.toHaveProperty('seedSampleProject');
    // The controller exposes no seeder to invoke.
    expect((ctrl as any).sampleSeeder).toBeUndefined();
  });

  it('returns the created workspace (with no project attached)', async () => {
    const { ctrl } = buildController();

    const result: any = await ctrl.create(
      { name: 'My Workspace' } as any,
      admin as any,
      req,
      {} as any,
    );

    const ws = result?.data ?? result?.workspace ?? result;
    expect(ws).toBeDefined();
    expect(ws.id).toBe('ws-1');
    expect(ws.projects ?? []).toHaveLength(0);
  });
});
