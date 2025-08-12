import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPermissionGuard } from './project-permission.guard';
import { TeamMember } from '../entities/team-member.entity';
import { RoleType } from '../entities/role.entity';
// Access control tokens removed - using built-in NestJS guards instead
const TEAM_MEMBER_READ = 'team_member:read';

describe('ProjectPermissionGuard', () => {
  let guard: ProjectPermissionGuard;
  let reflector: Reflector;
  let teamMemberRepository: Repository<TeamMember>;

  const mockTeamMemberRepository = {
    findOne: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({
        user: { id: 'user-123' },
        params: { projectId: 'project-123' },
      })),
    })),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectPermissionGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: TEAM_MEMBER_READ,
          useValue: mockTeamMemberRepository,
        },
      ],
    }).compile();

    guard = module.get<ProjectPermissionGuard>(ProjectPermissionGuard);
    reflector = module.get<Reflector>(Reflector);
    teamMemberRepository = module.get<Repository<TeamMember>>(TEAM_MEMBER_READ);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when no specific permissions are required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when project ID is not found', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);
      const contextWithoutProjectId = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            user: { id: 'user-123' },
            params: {},
          })),
        })),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(contextWithoutProjectId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(contextWithoutProjectId)).rejects.toThrow(
        'Project ID not found in request',
      );
    });

    it('should throw ForbiddenException when user is not a team member', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);
      mockTeamMemberRepository.findOne.mockResolvedValue(null);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'You are not a member of this project team',
      );

      expect(mockTeamMemberRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          team: { projectId: 'project-123' },
        },
        relations: ['role', 'team'],
      });
    });

    it('should return true when user has required permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);
      const mockTeamMember = {
        role: { name: 'admin' as RoleType },
        team: { projectId: 'project-123' },
      };
      mockTeamMemberRepository.findOne.mockResolvedValue(mockTeamMember);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);
      const mockTeamMember = {
        role: { name: 'viewer' as RoleType },
        team: { projectId: 'project-123' },
      };
      mockTeamMemberRepository.findOne.mockResolvedValue(mockTeamMember);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'Insufficient permissions. Required: admin',
      );
    });

    it('should handle multiple required permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin', 'pm']);
      const mockTeamMember = {
        role: { name: 'pm' as RoleType },
        team: { projectId: 'project-123' },
      };
      mockTeamMemberRepository.findOne.mockResolvedValue(mockTeamMember);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should extract projectId from params.id when projectId is not available', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);
      const contextWithIdParam = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            user: { id: 'user-123' },
            params: { id: 'project-456' },
          })),
        })),
      } as unknown as ExecutionContext;

      const mockTeamMember = {
        role: { name: 'admin' as RoleType },
        team: { projectId: 'project-456' },
      };
      mockTeamMemberRepository.findOne.mockResolvedValue(mockTeamMember);

      const result = await guard.canActivate(contextWithIdParam);

      expect(result).toBe(true);
      expect(mockTeamMemberRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          team: { projectId: 'project-456' },
        },
        relations: ['role', 'team'],
      });
    });
  });

  describe('token injection', () => {
    it('should use TEAM_MEMBER_READ token for repository injection', () => {
      expect(teamMemberRepository).toBeDefined();
      expect(teamMemberRepository).toBe(mockTeamMemberRepository);
    });
  });
});
