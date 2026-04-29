import { Repository } from 'typeorm';
import { WorkspacePermissionService } from './workspace-permission.service';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { OrgPolicyService } from '../../../organizations/services/org-policy.service';

describe('WorkspacePermissionService (default permissions matrix)', () => {
  let service: WorkspacePermissionService;
  let workspaceRepo: jest.Mocked<Pick<Repository<Workspace>, 'findOne'>>;
  let memberRepo: jest.Mocked<Pick<Repository<WorkspaceMember>, 'findOne'>>;
  let orgPolicyService: Pick<
    OrgPolicyService,
    'getPermissionMatrix' | 'getWorkspacePermissionDefaults' | 'isMatrixPolicyAllowed'
  >;

  const orgId = 'org-1';
  const wsId = 'ws-1';

  beforeEach(() => {
    workspaceRepo = {
      findOne: jest.fn(),
    };
    memberRepo = {
      findOne: jest.fn(),
    };
    orgPolicyService = {
      getPermissionMatrix: jest.fn().mockResolvedValue({ member: {}, viewer: {} }),
      getWorkspacePermissionDefaults: jest
        .fn()
        .mockResolvedValue({ owner: {}, member: {}, viewer: {} }),
      isMatrixPolicyAllowed: jest.fn().mockReturnValue(true),
    };
    service = new WorkspacePermissionService(
      workspaceRepo as unknown as Repository<Workspace>,
      memberRepo as unknown as Repository<WorkspaceMember>,
      orgPolicyService as unknown as OrgPolicyService,
    );
  });

  function mockWorkspace(permissionsConfig: Record<string, string[]> | null) {
    workspaceRepo.findOne.mockResolvedValue({
      id: wsId,
      organizationId: orgId,
      permissionsConfig,
    } as Workspace);
  }

  it('denies workspace_member create_project_in_workspace when using default matrix (null config)', async () => {
    mockWorkspace(null);
    memberRepo.findOne.mockResolvedValue({
      role: 'workspace_member',
    } as WorkspaceMember);

    const allowed = await service.isAllowed(
      { id: 'u1', organizationId: orgId, role: 'member' },
      wsId,
      'create_project_in_workspace',
    );

    expect(allowed).toBe(false);
  });

  it('allows workspace_member create_document_in_workspace under default matrix', async () => {
    mockWorkspace(null);
    memberRepo.findOne.mockResolvedValue({
      role: 'workspace_member',
    } as WorkspaceMember);

    const allowed = await service.isAllowed(
      { id: 'u1', organizationId: orgId, role: 'member' },
      wsId,
      'create_document_in_workspace',
    );

    expect(allowed).toBe(true);
  });

  it('denies workspace_viewer create_document_in_workspace under default matrix', async () => {
    mockWorkspace(null);
    memberRepo.findOne.mockResolvedValue({
      role: 'workspace_viewer',
    } as WorkspaceMember);

    const allowed = await service.isAllowed(
      { id: 'u1', organizationId: orgId, role: 'member' },
      wsId,
      'create_document_in_workspace',
    );

    expect(allowed).toBe(false);
  });

  it('allows workspace_owner create_project_in_workspace under default matrix', async () => {
    mockWorkspace(null);
    memberRepo.findOne.mockResolvedValue({
      role: 'workspace_owner',
    } as WorkspaceMember);

    const allowed = await service.isAllowed(
      { id: 'u1', organizationId: orgId, role: 'member' },
      wsId,
      'create_project_in_workspace',
    );

    expect(allowed).toBe(true);
  });

  it('denies delete_workspace for workspace_owner when platform role is MEMBER', async () => {
    mockWorkspace(null);
    memberRepo.findOne.mockResolvedValue({
      role: 'workspace_owner',
    } as WorkspaceMember);

    const allowed = await service.isAllowed(
      { id: 'u1', organizationId: orgId, role: 'member' },
      wsId,
      'delete_workspace',
    );

    expect(allowed).toBe(false);
  });

  it('denies archive_workspace for workspace_owner when platform role is MEMBER', async () => {
    mockWorkspace(null);
    memberRepo.findOne.mockResolvedValue({
      role: 'workspace_owner',
    } as WorkspaceMember);

    const allowed = await service.isAllowed(
      { id: 'u1', organizationId: orgId, role: 'member' },
      wsId,
      'archive_workspace',
    );

    expect(allowed).toBe(false);
  });

  it('allows delete_workspace for org platform ADMIN', async () => {
    mockWorkspace(null);

    const allowed = await service.isAllowed(
      { id: 'u1', organizationId: orgId, role: 'admin' },
      wsId,
      'delete_workspace',
    );

    expect(allowed).toBe(true);
  });
});
