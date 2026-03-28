import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ProjectBudgetsService,
  BudgetActorContext,
} from '../services/project-budgets.service';
import { ProjectBudgetEntity } from '../entities/project-budget.entity';

describe('ProjectBudgetsService', () => {
  let service: ProjectBudgetsService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const wsId = 'ws-1';
  const projId = 'proj-1';
  const ownerActor: BudgetActorContext = { userId: 'user-1', workspaceRole: 'OWNER' };
  const memberActor: BudgetActorContext = { userId: 'user-2', workspaceRole: 'MEMBER' };

  const makeBudget = (overrides: Partial<ProjectBudgetEntity> = {}): ProjectBudgetEntity =>
    ({
      id: 'budget-1',
      workspaceId: wsId,
      projectId: projId,
      baselineBudget: '0',
      revisedBudget: '0',
      contingency: '0',
      approvedChangeBudget: '0',
      forecastAtCompletion: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as ProjectBudgetEntity;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) =>
        Promise.resolve({ id: 'budget-1', ...data }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectBudgetsService,
        { provide: getRepositoryToken(ProjectBudgetEntity), useValue: repo },
      ],
    }).compile();

    service = module.get(ProjectBudgetsService);
  });

  // ── get (upsert-on-read) ──
  describe('get', () => {
    it('returns existing budget', async () => {
      const budget = makeBudget({ baselineBudget: '50000.00' });
      repo.findOne.mockResolvedValue(budget);

      const result = await service.get(wsId, projId);
      expect(result.baselineBudget).toBe('50000.00');
    });

    it('auto-creates a zero budget when none exists', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.get(wsId, projId);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: wsId,
          projectId: projId,
          baselineBudget: '0',
        }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ── update ──
  describe('update', () => {
    it('allows OWNER to patch budget', async () => {
      const budget = makeBudget();
      repo.findOne.mockResolvedValue(budget);

      await service.update(wsId, projId, { baselineBudget: '100000.00' }, ownerActor);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ baselineBudget: '100000.00' }),
      );
    });

    it('allows ADMIN to patch budget', async () => {
      const adminActor: BudgetActorContext = { userId: 'u-admin', workspaceRole: 'ADMIN' };
      const budget = makeBudget();
      repo.findOne.mockResolvedValue(budget);

      await service.update(wsId, projId, { contingency: '5000' }, adminActor);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ contingency: '5000' }),
      );
    });

    it('rejects MEMBER from patching budget', async () => {
      await expect(
        service.update(wsId, projId, { baselineBudget: '999' }, memberActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects GUEST from patching budget', async () => {
      const guestActor: BudgetActorContext = { userId: 'u-guest', workspaceRole: 'GUEST' };
      await expect(
        service.update(wsId, projId, { baselineBudget: '999' }, guestActor),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
