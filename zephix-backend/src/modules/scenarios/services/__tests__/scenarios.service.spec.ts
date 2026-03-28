/**
 * Phase 2F: Scenarios CRUD Service Tests
 */
import { ScenariosService } from '../scenarios.service';
import { NotFoundException } from '@nestjs/common';

describe('ScenariosService', () => {
  let service: ScenariosService;
  const mockPlanRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };
  const mockActionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const mockResultRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const mockEntitlementService = {
    assertWithinLimit: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    record: jest.fn().mockResolvedValue({ id: 'evt-1' }),
  } as any;

  const orgId = 'org-1';
  const wsId = 'ws-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScenariosService(
      mockPlanRepo as any,
      mockActionRepo as any,
      mockResultRepo as any,
      mockEntitlementService as any,
      mockAuditService,
    );
  });

  describe('create', () => {
    it('creates a new scenario with draft status', async () => {
      const input = {
        organizationId: orgId,
        workspaceId: wsId,
        name: 'Test Scenario',
        scopeType: 'project' as const,
        scopeId: 'proj-1',
        createdBy: 'user-1',
      };
      mockPlanRepo.create.mockReturnValue({ ...input, id: 'sc-1', status: 'draft' });
      mockPlanRepo.save.mockResolvedValue({ ...input, id: 'sc-1', status: 'draft' });

      const result = await service.create(input);
      expect(result.status).toBe('draft');
      expect(mockPlanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft', name: 'Test Scenario' }),
      );
    });
  });

  describe('list', () => {
    it('returns scenarios scoped by org and workspace', async () => {
      mockPlanRepo.find.mockResolvedValue([{ id: 'sc-1', name: 'S1' }]);
      const result = await service.list(orgId, wsId);
      expect(mockPlanRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId, workspaceId: wsId, deletedAt: null },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      mockPlanRepo.findOne.mockResolvedValue(null);
      await expect(service.getById('sc-999', orgId)).rejects.toThrow(NotFoundException);
    });

    it('returns scenario with relations when found', async () => {
      mockPlanRepo.findOne.mockResolvedValue({ id: 'sc-1', actions: [], result: null });
      const result = await service.getById('sc-1', orgId);
      expect(result.id).toBe('sc-1');
    });

    it('scopes query by organizationId — cross-org isolation', async () => {
      mockPlanRepo.findOne.mockResolvedValue(null);
      await expect(service.getById('sc-1', 'org-other')).rejects.toThrow(NotFoundException);
      expect(mockPlanRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-other' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates name and status', async () => {
      const plan = { id: 'sc-1', name: 'Old', status: 'draft', organizationId: orgId };
      mockPlanRepo.findOne.mockResolvedValue(plan);
      mockPlanRepo.save.mockResolvedValue({ ...plan, name: 'New', status: 'active' });

      const result = await service.update('sc-1', orgId, { name: 'New', status: 'active' });
      expect(plan.name).toBe('New');
      expect(plan.status).toBe('active');
    });
  });

  describe('softDelete', () => {
    it('sets deletedAt timestamp', async () => {
      const plan = { id: 'sc-1', deletedAt: null, organizationId: orgId };
      mockPlanRepo.findOne.mockResolvedValue(plan);
      mockPlanRepo.save.mockResolvedValue(plan);

      await service.softDelete('sc-1', orgId);
      expect(plan.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('addAction', () => {
    it('creates action linked to scenario', async () => {
      mockPlanRepo.findOne.mockResolvedValue({ id: 'sc-1' });
      mockActionRepo.create.mockReturnValue({ id: 'a-1', scenarioId: 'sc-1' });
      mockActionRepo.save.mockResolvedValue({ id: 'a-1', scenarioId: 'sc-1' });

      const result = await service.addAction({
        scenarioId: 'sc-1',
        organizationId: orgId,
        actionType: 'shift_project',
        payload: { projectId: 'p1', shiftDays: 7 },
      });
      expect(result.scenarioId).toBe('sc-1');
    });

    it('throws if scenario not found', async () => {
      mockPlanRepo.findOne.mockResolvedValue(null);
      await expect(
        service.addAction({
          scenarioId: 'sc-999',
          organizationId: orgId,
          actionType: 'shift_project',
          payload: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAction', () => {
    it('removes action by id', async () => {
      mockActionRepo.findOne.mockResolvedValue({ id: 'a-1' });
      await service.removeAction('a-1', 'sc-1', orgId);
      expect(mockActionRepo.remove).toHaveBeenCalled();
    });

    it('throws if action not found', async () => {
      mockActionRepo.findOne.mockResolvedValue(null);
      await expect(service.removeAction('a-999', 'sc-1', orgId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertResult', () => {
    it('updates existing result', async () => {
      const existing = { id: 'r-1', scenarioId: 'sc-1', summary: {} };
      mockResultRepo.findOne.mockResolvedValue(existing);
      mockResultRepo.save.mockResolvedValue(existing);

      await service.upsertResult('sc-1', orgId, { data: 'new' }, []);
      expect(existing.summary).toEqual({ data: 'new' });
    });

    it('creates new result when none exists', async () => {
      mockResultRepo.findOne.mockResolvedValue(null);
      mockResultRepo.create.mockReturnValue({ id: 'r-new' });
      mockResultRepo.save.mockResolvedValue({ id: 'r-new' });

      await service.upsertResult('sc-1', orgId, { data: 'fresh' }, ['warn1']);
      expect(mockResultRepo.create).toHaveBeenCalled();
    });
  });
});
