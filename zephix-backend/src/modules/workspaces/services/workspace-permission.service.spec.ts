import { Repository } from 'typeorm';
import { WorkspacePermissionService } from './workspace-permission.service';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';

describe('WorkspacePermissionService (default permissions matrix)', () => {
  let service: WorkspacePermissionService;
  let workspaceRepo: jest.Mocked<Pick<Repository<Workspace>, 'findOne'>>;
  let memberRepo: jest.Mocked<Pick<Repository<WorkspaceMember>, 'findOne'>>;

  const orgId = 'org-1';
  const wsId = 'ws-1';

  beforeEach(() => {
    workspaceRepo = {
      findOne: jest.fn(),
    };
    memberRepo = {
      findOne: jest.fn(),
    };
    service = new WorkspacePermissionService(
      workspaceRepo as unknown as Repository<Workspace>,
      memberRepo as unknown as Repository<WorkspaceMember>,
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
});
