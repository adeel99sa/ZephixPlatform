import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import { ProjectsService } from './projects.service';
import { Project } from '../entities/project.entity';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Role, RoleType } from '../entities/role.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';
import { UpdateTeamMemberDto } from '../dto/update-team-member.dto';
import { User } from '../../users/entities/user.entity';

/**
 * Projects Service Unit Tests
 *
 * Comprehensive test suite for the ProjectsService covering all CRUD operations,
 * team management, and permission checking functionality.
 *
 * @author Zephix Development Team
 * @version 1.0.0
 */
describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: Repository<Project>;
  let teamRepository: Repository<Team>;
  let teamMemberRepository: Repository<TeamMember>;
  let roleRepository: Repository<Role>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject: Project = {
    id: 'project-123',
    name: 'Test Project',
    description: 'Test Description',
    status: 'active' as any,
    priority: 'medium' as any,
    createdBy: mockUser,
    createdById: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeam: Team = {
    id: 'team-123',
    name: 'Test Team',
    description: 'Test Team Description',
    project: mockProject,
    projectId: mockProject.id,
    members: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRole: Role = {
    id: 'role-123',
    name: RoleType.ADMIN,
    description: 'Admin role',
    permissions: ['read', 'write', 'delete'],
    teamMembers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeamMember: TeamMember = {
    id: 'member-123',
    team: mockTeam,
    teamId: mockTeam.id,
    user: mockUser,
    userId: mockUser.id,
    role: mockRole,
    roleId: mockRole.id,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Team),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TeamMember),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    teamRepository = module.get<Repository<Team>>(getRepositoryToken(Team));
    teamMemberRepository = module.get<Repository<TeamMember>>(
      getRepositoryToken(TeamMember),
    );
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createProjectDto: CreateProjectDto = {
      name: 'New Project',
      description: 'New Project Description',
      status: 'planning' as any,
      priority: 'high' as any,
    };

    it('should create a project successfully', async () => {
      const mockCreatedProject = { ...mockProject, ...createProjectDto };
      const mockCreatedTeam = { ...mockTeam, project: mockCreatedProject };
      const mockCreatedTeamMember = {
        ...mockTeamMember,
        team: mockCreatedTeam,
      };

      jest
        .spyOn(projectRepository, 'create')
        .mockReturnValue(mockCreatedProject);
      jest
        .spyOn(projectRepository, 'save')
        .mockResolvedValue(mockCreatedProject);
      jest.spyOn(teamRepository, 'create').mockReturnValue(mockCreatedTeam);
      jest.spyOn(teamRepository, 'save').mockResolvedValue(mockCreatedTeam);
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(mockRole);
      jest
        .spyOn(teamMemberRepository, 'create')
        .mockReturnValue(mockCreatedTeamMember);
      jest
        .spyOn(teamMemberRepository, 'save')
        .mockResolvedValue(mockCreatedTeamMember);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockCreatedProject);

      const result = await service.create(createProjectDto, mockUser);

      expect(result).toEqual(mockCreatedProject);
      expect(projectRepository.create).toHaveBeenCalledWith({
        ...createProjectDto,
        createdBy: mockUser,
      });
      expect(projectRepository.save).toHaveBeenCalledWith(mockCreatedProject);
    });

    it('should throw an error if project creation fails', async () => {
      jest.spyOn(projectRepository, 'create').mockReturnValue(mockProject);
      jest
        .spyOn(projectRepository, 'save')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.create(createProjectDto, mockUser)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findAll', () => {
    it('should return all projects for a user', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockProject]),
      };

      jest
        .spyOn(projectRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll(mockUser);

      expect(result).toEqual([mockProject]);
      expect(projectRepository.createQueryBuilder).toHaveBeenCalledWith(
        'project',
      );
    });

    it('should return empty array when user has no projects', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(projectRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a project by id', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      const result = await service.findOne('project-123');

      expect(result).toEqual(mockProject);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        relations: [
          'team',
          'team.members',
          'team.members.user',
          'team.members.role',
          'createdBy',
        ],
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateProjectDto: UpdateProjectDto = {
      name: 'Updated Project',
      description: 'Updated Description',
    };

    it('should update a project successfully', async () => {
      const updatedProject = { ...mockProject, ...updateProjectDto };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(updatedProject);
      jest.spyOn(service, 'findOne').mockResolvedValue(updatedProject);

      const result = await service.update(
        'project-123',
        updateProjectDto,
        mockUser,
      );

      expect(result).toEqual(updatedProject);
      expect(projectRepository.save).toHaveBeenCalledWith(updatedProject);
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProject);
      // Note: checkUserPermission is private method, cannot be mocked

      await expect(
        service.update('project-123', updateProjectDto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove a project successfully', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'remove').mockResolvedValue(mockProject);

      await service.remove('project-123', mockUser);

      expect(projectRepository.remove).toHaveBeenCalledWith(mockProject);
    });

    it('should throw ForbiddenException when user lacks admin permission', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProject);
      // Note: checkUserPermission is private method, cannot be mocked

      await expect(service.remove('project-123', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addTeamMember', () => {
    const addTeamMemberDto: AddTeamMemberDto = {
      userId: 'new-user-123',
      role: RoleType.EDITOR,
    };

    it('should add a team member successfully', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(mockRole);
      jest.spyOn(teamMemberRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(teamMemberRepository, 'create')
        .mockReturnValue(mockTeamMember);
      jest
        .spyOn(teamMemberRepository, 'save')
        .mockResolvedValue(mockTeamMember);

      const result = await service.addTeamMember(
        'project-123',
        addTeamMemberDto,
        mockUser,
      );

      expect(result).toEqual(mockTeamMember);
      expect(teamMemberRepository.create).toHaveBeenCalledWith({
        team: mockProject.team,
        userId: addTeamMemberDto.userId,
        role: mockRole,
        joinedAt: expect.any(Date),
      });
    });

    it('should throw ConflictException when user is already a team member', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProject);
      jest
        .spyOn(teamMemberRepository, 'findOne')
        .mockResolvedValue(mockTeamMember);

      await expect(
        service.addTeamMember('project-123', addTeamMemberDto, mockUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when role not found', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.addTeamMember('project-123', addTeamMemberDto, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTeamMember', () => {
    const updateTeamMemberDto: UpdateTeamMemberDto = {
      role: RoleType.EDITOR,
    };

    it('should update team member role successfully', async () => {
      const updatedTeamMember = {
        ...mockTeamMember,
        role: { ...mockRole, name: RoleType.EDITOR },
      };

      jest
        .spyOn(teamMemberRepository, 'findOne')
        .mockResolvedValue(mockTeamMember);
      jest
        .spyOn(roleRepository, 'findOne')
        .mockResolvedValue({ ...mockRole, name: RoleType.EDITOR });
      jest
        .spyOn(teamMemberRepository, 'save')
        .mockResolvedValue(updatedTeamMember);

      const result = await service.updateTeamMember(
        'project-123',
        'member-123',
        updateTeamMemberDto,
        mockUser,
      );

      expect(result).toEqual(updatedTeamMember);
    });

    it('should throw NotFoundException when team member not found', async () => {
      jest.spyOn(teamMemberRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.updateTeamMember(
          'project-123',
          'member-123',
          updateTeamMemberDto,
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeTeamMember', () => {
    it('should remove team member successfully', async () => {
      jest
        .spyOn(teamMemberRepository, 'findOne')
        .mockResolvedValue(mockTeamMember);
      jest
        .spyOn(teamMemberRepository, 'remove')
        .mockResolvedValue(mockTeamMember);

      await service.removeTeamMember('project-123', 'member-123', mockUser);

      expect(teamMemberRepository.remove).toHaveBeenCalledWith(mockTeamMember);
    });

    it('should throw NotFoundException when team member not found', async () => {
      jest.spyOn(teamMemberRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.removeTeamMember('project-123', 'member-123', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkUserPermission', () => {
    it('should pass when user has required permissions', async () => {
      const teamMemberWithAdminRole = {
        ...mockTeamMember,
        role: { ...mockRole, name: RoleType.ADMIN },
      };

      jest
        .spyOn(teamMemberRepository, 'findOne')
        .mockResolvedValue(teamMemberWithAdminRole);

      await expect(
        service['checkUserPermission']('project-123', 'user-123', [
          RoleType.ADMIN,
        ]),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user is not a team member', async () => {
      jest.spyOn(teamMemberRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service['checkUserPermission']('project-123', 'user-123', [
          RoleType.ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user lacks required permissions', async () => {
      const teamMemberWithViewerRole = {
        ...mockTeamMember,
        role: { ...mockRole, name: RoleType.VIEWER },
      };

      jest
        .spyOn(teamMemberRepository, 'findOne')
        .mockResolvedValue(teamMemberWithViewerRole);

      await expect(
        service['checkUserPermission']('project-123', 'user-123', [
          RoleType.ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
