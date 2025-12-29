import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WorkspaceAccessService } from './workspace-access.service';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';

describe('WorkspaceAccessService', () => {
  let service: WorkspaceAccessService;
  let memberRepo: Repository<WorkspaceMember>;
  let configService: ConfigService;

  const mockMemberRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('1'), // Feature flag enabled
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceAccessService,
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: mockMemberRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<WorkspaceAccessService>(WorkspaceAccessService);
    memberRepo = module.get<Repository<WorkspaceMember>>(
      getRepositoryToken(WorkspaceMember),
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEffectiveWorkspaceRole', () => {
    const orgId = 'org-123';
    const workspaceId = 'ws-123';
    const userId = 'user-123';

    it('should return workspace_owner for platform ADMIN even without WorkspaceMember row', async () => {
      mockMemberRepo.findOne.mockResolvedValue(null);

      const result = await service.getEffectiveWorkspaceRole({
        userId,
        orgId,
        platformRole: PlatformRole.ADMIN,
        workspaceId,
      });

      expect(result).toBe('workspace_owner');
      expect(mockMemberRepo.findOne).not.toHaveBeenCalled();
    });

    it('should return workspace_owner for platform ADMIN with legacy role string', async () => {
      const result = await service.getEffectiveWorkspaceRole({
        userId,
        orgId,
        platformRole: 'admin', // Legacy string
        workspaceId,
      });

      expect(result).toBe('workspace_owner');
    });

    it('should return workspace_member for MEMBER with WorkspaceMember row', async () => {
      const mockMember = {
        id: 'member-123',
        workspaceId,
        userId,
        role: 'workspace_member' as const,
        workspace: { organizationId: orgId },
      };

      mockMemberRepo.findOne.mockResolvedValue(mockMember);

      const result = await service.getEffectiveWorkspaceRole({
        userId,
        orgId,
        platformRole: PlatformRole.MEMBER,
        workspaceId,
      });

      expect(result).toBe('workspace_member');
      expect(mockMemberRepo.findOne).toHaveBeenCalledWith({
        where: { workspaceId, userId },
        relations: ['workspace'],
      });
    });

    it('should return workspace_viewer for VIEWER with WorkspaceMember row', async () => {
      const mockMember = {
        id: 'member-123',
        workspaceId,
        userId,
        role: 'workspace_viewer' as const,
        workspace: { organizationId: orgId },
      };

      mockMemberRepo.findOne.mockResolvedValue(mockMember);

      const result = await service.getEffectiveWorkspaceRole({
        userId,
        orgId,
        platformRole: PlatformRole.VIEWER,
        workspaceId,
      });

      expect(result).toBe('workspace_viewer');
    });

    it('should return null for MEMBER with no WorkspaceMember row', async () => {
      mockMemberRepo.findOne.mockResolvedValue(null);

      const result = await service.getEffectiveWorkspaceRole({
        userId,
        orgId,
        platformRole: PlatformRole.MEMBER,
        workspaceId,
      });

      expect(result).toBeNull();
    });

    it('should return null for VIEWER with no WorkspaceMember row', async () => {
      mockMemberRepo.findOne.mockResolvedValue(null);

      const result = await service.getEffectiveWorkspaceRole({
        userId,
        orgId,
        platformRole: PlatformRole.VIEWER,
        workspaceId,
      });

      expect(result).toBeNull();
    });

    it('should return null if workspace belongs to different organization', async () => {
      const mockMember = {
        id: 'member-123',
        workspaceId,
        userId,
        role: 'workspace_member' as const,
        workspace: { organizationId: 'different-org' },
      };

      mockMemberRepo.findOne.mockResolvedValue(mockMember);

      const result = await service.getEffectiveWorkspaceRole({
        userId,
        orgId,
        platformRole: PlatformRole.MEMBER,
        workspaceId,
      });

      expect(result).toBeNull();
    });
  });

  describe('hasWorkspaceRoleAtLeast', () => {
    it('should return true when actual role satisfies required role', () => {
      expect(
        service.hasWorkspaceRoleAtLeast('workspace_viewer', 'workspace_owner'),
      ).toBe(true);
      expect(
        service.hasWorkspaceRoleAtLeast('workspace_member', 'workspace_member'),
      ).toBe(true);
      expect(
        service.hasWorkspaceRoleAtLeast('workspace_owner', 'workspace_viewer'),
      ).toBe(true);
    });

    it('should return false when actual role does not satisfy required role', () => {
      expect(
        service.hasWorkspaceRoleAtLeast('workspace_viewer', 'workspace_member'),
      ).toBe(false);
      expect(
        service.hasWorkspaceRoleAtLeast('workspace_member', 'workspace_owner'),
      ).toBe(false);
    });

    it('should return false for null actual role', () => {
      expect(
        service.hasWorkspaceRoleAtLeast('workspace_viewer', null),
      ).toBe(false);
    });
  });
});






