import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from '../services/projects.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { Methodology } from '../entities/project.entity';

// ✅ SENIOR-LEVEL CONTROLLER TEST IMPLEMENTATION
describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test Description',
    methodology: Methodology.Agile,
    organizationId: 'org-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProjectsService = {
    create: jest.fn().mockResolvedValue(mockProject),
    findAll: jest.fn().mockResolvedValue([mockProject]),
    findOne: jest.fn().mockResolvedValue(mockProject),
    update: jest.fn().mockResolvedValue(mockProject),
    remove: jest.fn().mockResolvedValue(undefined),
    addTeamMember: jest.fn().mockResolvedValue({
      id: 'member-1',
      userId: 'user-2',
      roleId: 'role-1',
    }),
    updateTeamMember: jest.fn().mockResolvedValue({
      id: 'member-1',
      userId: 'user-2',
      roleId: 'role-2',
    }),
    removeTeamMember: jest.fn().mockResolvedValue(undefined),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    organizationId: 'org-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(OrganizationGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project', async () => {
      const createProjectDto: CreateProjectDto = {
        name: 'Test Project',
        description: 'Test Description',
        methodology: Methodology.Agile,
      };

      const mockRequest = { user: mockUser };

      const result = await controller.create(
        'org-1',
        createProjectDto,
        mockRequest as any,
      );

      expect(result).toEqual(mockProject);
      expect(service.create).toHaveBeenCalledWith(
        createProjectDto,
        'org-1',
        mockUser,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of projects', async () => {
      const result = await controller.findAll('org-1', {});

      expect(result).toEqual([mockProject]);
      expect(service.findAll).toHaveBeenCalledWith('org-1', {});
    });
  });

  describe('findOne', () => {
    it('should return a single project', async () => {
      const result = await controller.findOne('org-1', 'project-1');

      expect(result).toEqual(mockProject);
      expect(service.findOne).toHaveBeenCalledWith('project-1');
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project',
      };

      const mockRequest = { user: mockUser };

      const result = await controller.update(
        'org-1',
        'project-1',
        updateProjectDto,
        mockRequest as any,
      );

      expect(result).toEqual(mockProject);
      expect(service.update).toHaveBeenCalledWith(
        'project-1',
        updateProjectDto,
        mockUser,
      );
    });
  });

  describe('remove', () => {
    it('should remove a project', async () => {
      const mockRequest = { user: mockUser };

      await controller.remove('org-1', 'project-1', mockRequest as any);

      expect(service.remove).toHaveBeenCalledWith('project-1', mockUser);
    });
  });
});
