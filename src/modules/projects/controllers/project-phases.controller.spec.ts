import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPhasesController } from './project-phases.controller';
import { ProjectPhase } from '../entities/project-phase.entity';
import { Project } from '../entities/project.entity';

describe('ProjectPhasesController', () => {
  let controller: ProjectPhasesController;
  let phaseRepo: Repository<ProjectPhase>;
  let projectRepo: Repository<Project>;

  const mockPhaseRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockProjectRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectPhasesController],
      providers: [
        {
          provide: getRepositoryToken(ProjectPhase),
          useValue: mockPhaseRepo,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepo,
        },
      ],
    }).compile();

    controller = module.get<ProjectPhasesController>(ProjectPhasesController);
    phaseRepo = module.get<Repository<ProjectPhase>>(getRepositoryToken(ProjectPhase));
    projectRepo = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPhases', () => {
    it('should return phases for a valid project', async () => {
      const projectId = 'test-project-id';
      const mockProject = { id: projectId, name: 'Test Project' };
      const mockPhases = [
        { id: '1', name: 'Phase 1', order: 1, projectId },
        { id: '2', name: 'Phase 2', order: 2, projectId },
      ];

      mockProjectRepo.findOne.mockResolvedValue(mockProject);
      mockPhaseRepo.find.mockResolvedValue(mockPhases);

      const result = await controller.getPhases(projectId);

      expect(result).toEqual({
        success: true,
        data: mockPhases,
      });
      expect(mockProjectRepo.findOne).toHaveBeenCalledWith({ where: { id: projectId } });
      expect(mockPhaseRepo.find).toHaveBeenCalledWith({
        where: { projectId },
        order: { order: 'ASC' },
      });
    });

    it('should throw NotFoundException for invalid project', async () => {
      const projectId = 'invalid-project-id';
      mockProjectRepo.findOne.mockResolvedValue(null);

      await expect(controller.getPhases(projectId)).rejects.toThrow('Project with ID invalid-project-id not found');
    });
  });
});
