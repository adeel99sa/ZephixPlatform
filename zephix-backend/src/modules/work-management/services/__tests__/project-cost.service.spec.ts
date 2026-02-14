import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProjectCostService } from '../project-cost.service';
import { WorkTask } from '../../entities/work-task.entity';
import { Project } from '../../../projects/entities/project.entity';

describe('ProjectCostService', () => {
  let service: ProjectCostService;
  let projectRepo: any;
  let workTaskRepo: any;

  beforeEach(async () => {
    projectRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      })),
    };

    workTaskRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          plannedHours: '100.00',
          actualHours: '60.00',
          remainingHours: '40.00',
        }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectCostService,
        { provide: getRepositoryToken(WorkTask), useValue: workTaskRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
      ],
    }).compile();

    service = module.get<ProjectCostService>(ProjectCostService);
  });

  describe('getProjectCostSummary', () => {
    it('should compute cost metrics from task hours and project rate', async () => {
      projectRepo.findOne.mockResolvedValue({
        id: 'proj-1',
        budget: 50000,
        currency: 'USD',
        flatLaborRatePerHour: 100,
        costTrackingEnabled: true,
      });

      const result = await service.getProjectCostSummary('org-1', 'proj-1');

      expect(result.plannedHours).toBe(100);
      expect(result.actualHours).toBe(60);
      expect(result.remainingHours).toBe(40);
      expect(result.plannedCost).toBe(10000); // 100h * $100
      expect(result.actualCost).toBe(6000); // 60h * $100
      expect(result.costVariance).toBe(4000); // planned - actual
      expect(result.forecastAtCompletion).toBe(10000); // 6000 + 40*100
      expect(result.budgetAmount).toBe(50000);
      expect(result.currency).toBe('USD');
      expect(result.costTrackingEnabled).toBe(true);
    });

    it('should return zero costs when no rate is set', async () => {
      projectRepo.findOne.mockResolvedValue({
        id: 'proj-1',
        budget: null,
        currency: 'EUR',
        flatLaborRatePerHour: null,
        costTrackingEnabled: false,
      });

      const result = await service.getProjectCostSummary('org-1', 'proj-1');

      expect(result.rate).toBe(0);
      expect(result.plannedCost).toBe(0);
      expect(result.actualCost).toBe(0);
    });

    it('should return zeroed summary when costTrackingEnabled=false (C4)', async () => {
      projectRepo.findOne.mockResolvedValue({
        id: 'proj-1',
        budget: 50000,
        currency: 'USD',
        flatLaborRatePerHour: 100,
        costTrackingEnabled: false,
      });

      const result = await service.getProjectCostSummary('org-1', 'proj-1');

      expect(result.costTrackingEnabled).toBe(false);
      expect(result.rate).toBe(0);
      expect(result.plannedHours).toBe(0);
      expect(result.actualHours).toBe(0);
      expect(result.remainingHours).toBe(0);
      expect(result.plannedCost).toBe(0);
      expect(result.actualCost).toBe(0);
      expect(result.costVariance).toBe(0);
      expect(result.forecastAtCompletion).toBe(0);
      expect(result.budgetAmount).toBe(50000);
      // Confirm no task aggregate query was made
      expect(workTaskRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing project', async () => {
      projectRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getProjectCostSummary('org-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWorkspaceCostRollup', () => {
    it('should return empty array when no cost-tracked projects', async () => {
      const result = await service.getWorkspaceCostRollup('org-1', 'ws-1');
      expect(result).toEqual([]);
    });
  });
});
