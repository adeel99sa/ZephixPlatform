import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IterationsService } from '../../work-management/services/iterations.service';
import { Iteration, IterationStatus } from '../../work-management/entities/iteration.entity';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { Project } from '../../projects/entities/project.entity';
import { WorkPhasesService } from '../../work-management/services/work-phases.service';
import { WorkPhase } from '../../work-management/entities/work-phase.entity';
import { AuditEvent } from '../../work-management/entities/audit-event.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { AckTokenService } from '../../work-management/services/ack-token.service';

/**
 * Negative enforcement tests — prove that methodology config blocks
 * operations correctly in production-critical paths.
 */
describe('Methodology Enforcement (negative paths)', () => {
  // ═══════════════════════════════════════════════════════════════════
  // 1. Sprint create blocked when sprint.enabled = false
  // ═══════════════════════════════════════════════════════════════════
  describe('Sprint create blocked when sprint.enabled = false', () => {
    let iterationsService: IterationsService;

    beforeEach(async () => {
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'proj-kanban',
          iterationsEnabled: false,
          methodologyConfig: {
            sprint: { enabled: false, defaultLengthDays: 14 },
          },
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IterationsService,
          {
            provide: getRepositoryToken(Iteration),
            useValue: {
              create: jest.fn((d) => d),
              save: jest.fn(),
              find: jest.fn(),
              findOne: jest.fn(),
            },
          },
          { provide: getRepositoryToken(WorkTask), useValue: {} },
          { provide: getRepositoryToken(Project), useValue: projectRepo },
        ],
      }).compile();

      iterationsService = module.get<IterationsService>(IterationsService);
    });

    it('rejects sprint creation with ITERATIONS_DISABLED', async () => {
      await expect(
        iterationsService.create('org-1', 'ws-1', 'proj-kanban', {
          name: 'Sprint 1',
          startDate: '2026-03-01',
          endDate: '2026-03-14',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('error response contains ITERATIONS_DISABLED code', async () => {
      try {
        await iterationsService.create('org-1', 'ws-1', 'proj-kanban', {
          name: 'Sprint 1',
          startDate: '2026-03-01',
          endDate: '2026-03-14',
        });
        fail('Should have thrown');
      } catch (e: any) {
        const resp = typeof e.getResponse === 'function' ? e.getResponse() : e.response;
        expect(resp.code).toBe('ITERATIONS_DISABLED');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 2. Sprint start blocked when sprint.enabled = false
  // ═══════════════════════════════════════════════════════════════════
  describe('Sprint start blocked when sprint.enabled = false', () => {
    it('rejects starting a sprint on a non-sprint project', async () => {
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'proj-kanban',
          iterationsEnabled: false,
          methodologyConfig: { sprint: { enabled: false } },
        }),
      };

      const iterRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn().mockResolvedValue({
          id: 'iter-1',
          organizationId: 'org-1',
          projectId: 'proj-kanban',
          status: IterationStatus.PLANNING,
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          IterationsService,
          { provide: getRepositoryToken(Iteration), useValue: iterRepo },
          { provide: getRepositoryToken(WorkTask), useValue: {} },
          { provide: getRepositoryToken(Project), useValue: projectRepo },
        ],
      }).compile();

      const svc = module.get<IterationsService>(IterationsService);
      await expect(svc.start('org-1', 'iter-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3. Sprint allowed when sprint.enabled = true
  // ═══════════════════════════════════════════════════════════════════
  describe('Sprint allowed when sprint.enabled = true', () => {
    it('creates sprint on a sprint-enabled project', async () => {
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'proj-scrum',
          iterationsEnabled: true,
          methodologyConfig: {
            sprint: { enabled: true, defaultLengthDays: 14 },
          },
        }),
      };

      const iterRepo = {
        create: jest.fn((d) => ({ ...d, id: 'new-iter' })),
        save: jest.fn((e) => Promise.resolve(e)),
        find: jest.fn(),
        findOne: jest.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [
          IterationsService,
          { provide: getRepositoryToken(Iteration), useValue: iterRepo },
          { provide: getRepositoryToken(WorkTask), useValue: {} },
          { provide: getRepositoryToken(Project), useValue: projectRepo },
        ],
      }).compile();

      const svc = module.get<IterationsService>(IterationsService);
      const result = await svc.create('org-1', 'ws-1', 'proj-scrum', {
        name: 'Sprint 1',
        startDate: '2026-03-01',
        endDate: '2026-03-14',
      });

      expect(result).toBeDefined();
      expect(iterRepo.save).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 4. Phase complete blocked without approved gate submission
  // ═══════════════════════════════════════════════════════════════════
  describe('Phase complete gate enforcement', () => {
    let phasesService: WorkPhasesService;
    let mockDataSource: any;
    let mockPhaseRepo: any;
    let mockAuditRepo: any;

    const authCtx = { userId: 'user-1', organizationId: 'org-1', platformRole: 'ADMIN' };

    beforeEach(async () => {
      mockPhaseRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'phase-1',
          organizationId: 'org-1',
          workspaceId: 'ws-1',
          projectId: 'proj-wf',
          status: 'active',
          deletedAt: null,
        }),
        save: jest.fn((e) => Promise.resolve(e)),
      };

      mockAuditRepo = {
        create: jest.fn((d) => d),
        save: jest.fn((d) => Promise.resolve(d)),
      };

      mockDataSource = {
        query: jest.fn(),
        getRepository: jest.fn(),
      };

      const mockTenantContext = {
        assertOrganizationId: jest.fn().mockReturnValue('org-1'),
      };

      const mockWorkspaceAccess = {
        canAccessWorkspace: jest.fn().mockResolvedValue(true),
      };

      const mockAckToken = {
        createToken: jest.fn(),
        validateToken: jest.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [
          WorkPhasesService,
          { provide: getRepositoryToken(WorkPhase), useValue: mockPhaseRepo },
          { provide: getRepositoryToken(Project), useValue: {} },
          { provide: getRepositoryToken(AuditEvent), useValue: mockAuditRepo },
          { provide: DataSource, useValue: mockDataSource },
          { provide: WorkspaceAccessService, useValue: mockWorkspaceAccess },
          { provide: TenantContextService, useValue: mockTenantContext },
          { provide: AckTokenService, useValue: mockAckToken },
        ],
      }).compile();

      phasesService = module.get<WorkPhasesService>(WorkPhasesService);
    });

    it('rejects when gateRequired and no gate definitions', async () => {
      // Project has gateRequired: true
      mockDataSource.query
        .mockResolvedValueOnce([{ methodology_config: { phases: { gateRequired: true } } }])
        // No active gate definitions
        .mockResolvedValueOnce([]);

      await expect(
        phasesService.completePhase(authCtx, 'ws-1', 'phase-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when gates exist but none approved', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ methodology_config: { phases: { gateRequired: true } } }])
        .mockResolvedValueOnce([{ id: 'gate-def-1' }, { id: 'gate-def-2' }])
        .mockResolvedValueOnce([]);

      await expect(
        phasesService.completePhase(authCtx, 'ws-1', 'phase-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when only partial approvals', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ methodology_config: { phases: { gateRequired: true } } }])
        .mockResolvedValueOnce([{ id: 'gate-def-1' }, { id: 'gate-def-2' }])
        .mockResolvedValueOnce([{ gate_definition_id: 'gate-def-1' }]);

      await expect(
        phasesService.completePhase(authCtx, 'ws-1', 'phase-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows completion when all gates approved', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ methodology_config: { phases: { gateRequired: true } } }])
        .mockResolvedValueOnce([{ id: 'gate-def-1' }, { id: 'gate-def-2' }])
        .mockResolvedValueOnce([
          { gate_definition_id: 'gate-def-1' },
          { gate_definition_id: 'gate-def-2' },
        ]);

      const result = await phasesService.completePhase(authCtx, 'ws-1', 'phase-1');
      expect(result.status).toBe('completed');
      expect(mockPhaseRepo.save).toHaveBeenCalled();
    });

    it('allows completion when gateRequired = false without gate queries', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ methodology_config: { phases: { gateRequired: false } } }]);

      const result = await phasesService.completePhase(authCtx, 'ws-1', 'phase-1');
      expect(result.status).toBe('completed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 5. Legacy flag fallback when methodology_config absent
  // ═══════════════════════════════════════════════════════════════════
  describe('Falls back to legacy flag when methodology_config absent', () => {
    it('blocks sprint when iterationsEnabled = false and no config', async () => {
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'proj-legacy',
          iterationsEnabled: false,
          methodologyConfig: null,
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          IterationsService,
          {
            provide: getRepositoryToken(Iteration),
            useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() },
          },
          { provide: getRepositoryToken(WorkTask), useValue: {} },
          { provide: getRepositoryToken(Project), useValue: projectRepo },
        ],
      }).compile();

      const svc = module.get<IterationsService>(IterationsService);
      await expect(
        svc.create('org-1', 'ws-1', 'proj-legacy', {
          name: 'Sprint 1',
          startDate: '2026-03-01',
          endDate: '2026-03-14',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows sprint when iterationsEnabled = true and no config', async () => {
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'proj-legacy-ok',
          iterationsEnabled: true,
          methodologyConfig: null,
        }),
      };

      const iterRepo = {
        create: jest.fn((d) => ({ ...d, id: 'new' })),
        save: jest.fn((e) => Promise.resolve(e)),
        find: jest.fn(),
        findOne: jest.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [
          IterationsService,
          { provide: getRepositoryToken(Iteration), useValue: iterRepo },
          { provide: getRepositoryToken(WorkTask), useValue: {} },
          { provide: getRepositoryToken(Project), useValue: projectRepo },
        ],
      }).compile();

      const svc = module.get<IterationsService>(IterationsService);
      const result = await svc.create('org-1', 'ws-1', 'proj-legacy-ok', {
        name: 'Sprint 1',
        startDate: '2026-03-01',
        endDate: '2026-03-14',
      });

      expect(result).toBeDefined();
    });
  });
});
