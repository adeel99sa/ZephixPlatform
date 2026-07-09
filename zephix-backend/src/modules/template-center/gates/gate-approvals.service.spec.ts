import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GateApprovalsService } from './gate-approvals.service';
import { GateApproval } from './entities/gate-approval.entity';
import { Project } from '../../projects/entities/project.entity';
import { DocumentInstance } from '../documents/entities/document-instance.entity';
import { ProjectKpi } from '../kpis/entities/project-kpi.entity';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';

jest.mock('../template-center.flags', () => ({ isTemplateCenterEnabled: () => true }));

const PROJECT_ID = 'proj-uuid';
const ORG_ID = 'org-uuid';
const WS_ID = 'ws-uuid';
const USER_ID = 'user-uuid';
const APPROVAL_ID = 'approval-uuid';

const baseProject = {
  id: PROJECT_ID,
  organizationId: ORG_ID,
  workspaceId: WS_ID,
  capabilities: { use_gates: true },
};

describe('GateApprovalsService — GATE_DECIDE audit path', () => {
  let service: GateApprovalsService;
  let projectRepo: { findOne: jest.Mock };
  let docRepo: { find: jest.Mock };
  let kpiRepo: { find: jest.Mock };
  let approvalRepo: { create: jest.Mock; save: jest.Mock };
  let audit: { record: jest.Mock; recordOrThrow: jest.Mock };

  beforeEach(async () => {
    projectRepo = { findOne: jest.fn().mockResolvedValue(baseProject) };
    docRepo = { find: jest.fn().mockResolvedValue([]) };
    kpiRepo = { find: jest.fn().mockResolvedValue([]) };
    approvalRepo = {
      create: jest.fn((input) => input),
      save: jest.fn(async (row) => ({ ...row, id: APPROVAL_ID })),
    };
    audit = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      recordOrThrow: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GateApprovalsService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(DocumentInstance), useValue: docRepo },
        { provide: getRepositoryToken(ProjectKpi), useValue: kpiRepo },
        { provide: getRepositoryToken(GateApproval), useValue: approvalRepo },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(GateApprovalsService);
  });

  it('decide records GATE_DECIDE audit via recordOrThrow on success', async () => {
    const result = await service.decide(
      PROJECT_ID, 'phase-1', { decision: 'rejected' }, USER_ID,
      ORG_ID, WS_ID, 'ADMIN',
      { requiredDocKeys: [], requiredKpiKeys: [], requiredDocStates: [], requireAllKpis: false },
    );

    expect(result.decided).toBe(true);
    expect(approvalRepo.save).toHaveBeenCalled();
    expect(audit.recordOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_ID,
        actorUserId: USER_ID,
        entityType: AuditEntityType.GATE_APPROVAL,
        action: AuditAction.GATE_DECIDE,
        after: expect.objectContaining({ gateKey: 'phase-1', decision: 'rejected', projectId: PROJECT_ID }),
      }),
    );
  });

  it('decide throws when audit recordOrThrow fails (fail-closed)', async () => {
    audit.recordOrThrow.mockRejectedValueOnce(new Error('DB_WRITE_FAILED'));

    await expect(
      service.decide(
        PROJECT_ID, 'phase-1', { decision: 'rejected' }, USER_ID,
        ORG_ID, WS_ID, 'ADMIN',
        { requiredDocKeys: [], requiredKpiKeys: [], requiredDocStates: [], requireAllKpis: false },
      ),
    ).rejects.toThrow('DB_WRITE_FAILED');
  });
});
