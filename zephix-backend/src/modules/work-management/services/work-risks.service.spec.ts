import { NotFoundException } from '@nestjs/common';
import { WorkRisksService } from './work-risks.service';
import {
  RiskSeverity,
  RiskStatus,
  WorkRisk,
} from '../entities/work-risk.entity';
import { DOMAIN_EVENTS } from '../../kpi-queue/constants/queue.constants';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';

describe('WorkRisksService system writer', () => {
  const baseInput = {
    organizationId: '11111111-1111-1111-1111-111111111111',
    workspaceId: '22222222-2222-2222-2222-222222222222',
    projectId: '33333333-3333-3333-3333-333333333333',
    title: 'Detected schedule risk',
    description: 'Schedule is slipping',
    severity: RiskSeverity.HIGH,
    source: 'cron_detection',
    riskType: 'timeline_slippage',
    evidence: { delayedTasks: 3 },
    detectedAt: new Date('2026-04-28T00:00:00.000Z'),
  };

  function makeQb(result: WorkRisk | null = null) {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(result),
    };
  }

  function makeService(options: { existingRisk?: WorkRisk | null } = {}) {
    const qb = makeQb(options.existingRisk ?? null);
    const saved: WorkRisk[] = [];
    const riskRepository = {
      create: jest.fn((risk: Partial<WorkRisk>) => ({
        id: 'risk-new',
        ...risk,
      })),
      save: jest.fn(async (risk: WorkRisk) => {
        saved.push(risk);
        return risk;
      }),
      createQueryBuilder: jest.fn(() => qb),
    };
    const projectRepository = {
      findOne: jest.fn().mockResolvedValue({ id: baseInput.projectId }),
    };
    const tenantAwareRepo = {
      getRepository: jest.fn(() => riskRepository),
      createQueryBuilder: jest.fn(() => qb),
    };
    const domainEventEmitter = { emit: jest.fn().mockResolvedValue(undefined) };
    const auditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const service = new WorkRisksService(
      tenantAwareRepo as any,
      projectRepository as any,
      {} as any,
      {} as any,
      {
        assertOrganizationId: jest
          .fn()
          .mockReturnValue(baseInput.organizationId),
      } as any,
      domainEventEmitter as any,
      auditService as any,
    );

    return {
      service,
      qb,
      riskRepository,
      projectRepository,
      domainEventEmitter,
      auditService,
      saved,
    };
  }

  it('createSystemRisk validates project tenancy and applies defaults', async () => {
    const {
      service,
      riskRepository,
      projectRepository,
      domainEventEmitter,
      auditService,
    } = makeService();

    const risk = await service.createSystemRisk({
      ...baseInput,
      probability: 9,
      impact: 0,
    });

    expect(projectRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: baseInput.projectId,
        organizationId: baseInput.organizationId,
        workspaceId: baseInput.workspaceId,
      },
      select: ['id'],
    });
    expect(riskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: baseInput.organizationId,
        workspaceId: baseInput.workspaceId,
        projectId: baseInput.projectId,
        status: RiskStatus.OPEN,
        probability: 5,
        impact: 1,
        source: 'cron_detection',
        riskType: 'timeline_slippage',
      }),
    );
    expect(risk.id).toBe('risk-new');
    expect(domainEventEmitter.emit).toHaveBeenCalledWith(
      DOMAIN_EVENTS.RISK_CREATED,
      expect.objectContaining({
        workspaceId: baseInput.workspaceId,
        organizationId: baseInput.organizationId,
        projectId: baseInput.projectId,
        entityId: 'risk-new',
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: baseInput.organizationId,
        workspaceId: baseInput.workspaceId,
        entityType: AuditEntityType.WORK_RISK,
        action: AuditAction.CREATE,
      }),
      undefined,
    );
  });

  it('createSystemRisk rejects projects outside organization/workspace scope', async () => {
    const { service, projectRepository } = makeService();
    projectRepository.findOne.mockResolvedValue(null);

    await expect(service.createSystemRisk(baseInput)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('createSystemRisk uses a provided transaction manager', async () => {
    const { service } = makeService();
    const managerRiskRepo = {
      create: jest.fn((risk) => ({ id: 'risk-tx', ...risk })),
      save: jest.fn(async (risk) => risk),
    };
    const managerProjectRepo = {
      findOne: jest.fn().mockResolvedValue({ id: baseInput.projectId }),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === WorkRisk) return managerRiskRepo;
        return managerProjectRepo;
      }),
      save: jest.fn(async (_entity, value) => value),
    };

    const risk = await service.createSystemRisk(baseInput, manager as any);

    expect(risk.id).toBe('risk-tx');
    expect(manager.getRepository).toHaveBeenCalledWith(WorkRisk);
    expect(managerProjectRepo.findOne).toHaveBeenCalled();
  });

  it('findExistingSystemRisk returns only OPEN matching system risks', async () => {
    const existing = {
      id: 'risk-open',
      status: RiskStatus.OPEN,
    } as unknown as WorkRisk;
    const { service, qb } = makeService({ existingRisk: existing });

    const result = await service.findExistingSystemRisk(baseInput);

    expect(result).toBe(existing);
    expect(qb.andWhere).toHaveBeenCalledWith('risk.status = :status', {
      status: RiskStatus.OPEN,
    });
  });

  it('upsertSystemRisk creates when no existing risk matches', async () => {
    const { service } = makeService();

    const result = await service.upsertSystemRisk(baseInput);

    expect(result.action).toBe('created');
    expect(result.risk.id).toBe('risk-new');
  });

  it('upsertSystemRisk updates only evidence, detectedAt, and severity for OPEN risk', async () => {
    const existing = {
      id: 'risk-open',
      organizationId: baseInput.organizationId,
      workspaceId: baseInput.workspaceId,
      projectId: baseInput.projectId,
      title: 'Original title',
      description: 'Human narrative',
      status: RiskStatus.OPEN,
      severity: RiskSeverity.MEDIUM,
      mitigationPlan: 'Human mitigation',
      source: baseInput.source,
      riskType: baseInput.riskType,
      evidence: { old: true },
      detectedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as unknown as WorkRisk;
    const { service, riskRepository } = makeService({ existingRisk: existing });

    const result = await service.upsertSystemRisk({
      ...baseInput,
      description: 'New system description',
      mitigationPlan: 'New system mitigation',
      status: RiskStatus.CLOSED,
      evidence: { fresh: true },
      severity: RiskSeverity.CRITICAL,
    });

    expect(result.action).toBe('updated');
    expect(riskRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'risk-open',
        description: 'Human narrative',
        mitigationPlan: 'Human mitigation',
        status: RiskStatus.OPEN,
        evidence: { fresh: true },
        severity: RiskSeverity.CRITICAL,
      }),
    );
  });

  it('upsertSystemRisk skips non-OPEN human decisions without creating duplicates', async () => {
    const openQb = makeQb(null);
    const accepted = {
      id: 'risk-accepted',
      status: RiskStatus.ACCEPTED,
    } as WorkRisk;
    const nonOpenQb = makeQb(accepted);
    const { service, riskRepository } = makeService();
    riskRepository.createQueryBuilder
      .mockReturnValueOnce(openQb)
      .mockReturnValueOnce(nonOpenQb);

    const result = await service.upsertSystemRisk(baseInput);

    expect(result.action).toBe('skipped_non_open');
    expect(result.risk).toBe(accepted);
    expect(riskRepository.create).not.toHaveBeenCalled();
  });
});
