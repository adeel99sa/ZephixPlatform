import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GateApprovalChainService } from './gate-approval-chain.service';
import { GateApprovalChain } from '../entities/gate-approval-chain.entity';
import { GateApprovalChainStep, ApprovalType } from '../entities/gate-approval-chain-step.entity';
import { PhaseGateDefinition } from '../entities/phase-gate-definition.entity';
import { PoliciesService } from '../../policies/services/policies.service';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const WS_ID = '00000000-0000-0000-0000-000000000002';
const USER_ID = '00000000-0000-0000-0000-000000000003';
const PROJECT_ID = '00000000-0000-0000-0000-000000000004';
const GATE_DEF_ID = '00000000-0000-0000-0000-000000000010';
const CHAIN_ID = '00000000-0000-0000-0000-000000000020';

const auth = { organizationId: ORG_ID, userId: USER_ID };

function makeGateDef(overrides: Partial<PhaseGateDefinition> = {}): PhaseGateDefinition {
  return {
    id: GATE_DEF_ID,
    organizationId: ORG_ID,
    workspaceId: WS_ID,
    projectId: PROJECT_ID,
    phaseId: 'phase-1',
    name: 'Test Gate',
    gateKey: null,
    status: 'ACTIVE' as any,
    reviewersRolePolicy: null,
    requiredDocuments: null,
    requiredChecklist: null,
    thresholds: null,
    createdByUserId: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    project: null as any,
    phase: null as any,
    ...overrides,
  };
}

function makeChain(overrides: Partial<GateApprovalChain> = {}): GateApprovalChain {
  return {
    id: CHAIN_ID,
    organizationId: ORG_ID,
    workspaceId: WS_ID,
    gateDefinitionId: GATE_DEF_ID,
    name: 'Test Chain',
    description: null,
    isActive: true,
    createdByUserId: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    steps: [],
    ...overrides,
  };
}

function makeStep(
  overrides: Partial<GateApprovalChainStep> = {},
): GateApprovalChainStep {
  return {
    id: 'step-1',
    organizationId: ORG_ID,
    chainId: CHAIN_ID,
    stepOrder: 1,
    name: 'Step 1',
    description: null,
    requiredRole: 'ADMIN',
    requiredUserId: null,
    approvalType: ApprovalType.ANY_ONE,
    minApprovals: 1,
    autoApproveAfterHours: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    chain: null as any,
    ...overrides,
  };
}

describe('GateApprovalChainService', () => {
  let service: GateApprovalChainService;
  let chainRepo: Record<string, jest.Mock>;
  let stepRepo: Record<string, jest.Mock>;
  let gateDefRepo: Record<string, jest.Mock>;
  let policiesService: Record<string, jest.Mock>;

  beforeEach(async () => {
    chainRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ ...data, id: CHAIN_ID })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id || CHAIN_ID })),
    };
    stepRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((entities) => Promise.resolve(entities)),
      update: jest.fn().mockResolvedValue(undefined),
    };
    gateDefRepo = {
      findOne: jest.fn(),
    };
    policiesService = {
      resolvePolicy: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GateApprovalChainService,
        { provide: getRepositoryToken(GateApprovalChain), useValue: chainRepo },
        { provide: getRepositoryToken(GateApprovalChainStep), useValue: stepRepo },
        { provide: getRepositoryToken(PhaseGateDefinition), useValue: gateDefRepo },
        { provide: PoliciesService, useValue: policiesService },
      ],
    }).compile();

    service = module.get(GateApprovalChainService);
  });

  describe('createChain', () => {
    it('should create a chain with ordered steps', async () => {
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      chainRepo.findOne
        .mockResolvedValueOnce(null) // no existing chain
        .mockResolvedValueOnce(
          makeChain({
            steps: [
              makeStep({ id: 's1', stepOrder: 1, name: 'PM Review' }),
              makeStep({ id: 's2', stepOrder: 2, name: 'Finance' }),
            ],
          }),
        ); // getChainById call

      const result = await service.createChain(auth, WS_ID, {
        gateDefinitionId: GATE_DEF_ID,
        name: 'Test Chain',
        steps: [
          { name: 'PM Review', requiredRole: 'PMO' },
          { name: 'Finance', requiredRole: 'FINANCE' },
        ],
      });

      expect(chainRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
          workspaceId: WS_ID,
          gateDefinitionId: GATE_DEF_ID,
        }),
      );
      expect(stepRepo.save).toHaveBeenCalled();
    });

    it('should soft-delete existing chain before creating new one', async () => {
      const existingChain = makeChain();
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      chainRepo.findOne
        .mockResolvedValueOnce(existingChain) // existing chain
        .mockResolvedValueOnce(makeChain({ steps: [makeStep()] })); // getChainById

      await service.createChain(auth, WS_ID, {
        gateDefinitionId: GATE_DEF_ID,
        name: 'New Chain',
        steps: [{ name: 'Step', requiredRole: 'ADMIN' }],
      });

      expect(existingChain.deletedAt).not.toBeNull();
      expect(chainRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('should reject if gate definition not found (cross-org)', async () => {
      gateDefRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createChain(auth, WS_ID, {
          gateDefinitionId: 'wrong-id',
          name: 'Chain',
          steps: [{ name: 'Step', requiredRole: 'ADMIN' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject steps without target (no role or user)', async () => {
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      chainRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createChain(auth, WS_ID, {
          gateDefinitionId: GATE_DEF_ID,
          name: 'Chain',
          steps: [{ name: 'Orphan Step' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce policy min steps', async () => {
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      policiesService.resolvePolicy.mockResolvedValue(3); // require 3 steps

      await expect(
        service.createChain(auth, WS_ID, {
          gateDefinitionId: GATE_DEF_ID,
          name: 'Chain',
          steps: [
            { name: 'Step 1', requiredRole: 'ADMIN' },
            { name: 'Step 2', requiredRole: 'ADMIN' },
          ],
        }),
      ).rejects.toThrow(/at least 3 steps/);
    });

    it('should pass when steps meet min policy', async () => {
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      policiesService.resolvePolicy.mockResolvedValue(2);
      chainRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeChain({ steps: [makeStep(), makeStep({ id: 's2', stepOrder: 2 })] }));

      const result = await service.createChain(auth, WS_ID, {
        gateDefinitionId: GATE_DEF_ID,
        name: 'Chain',
        steps: [
          { name: 'Step 1', requiredRole: 'ADMIN' },
          { name: 'Step 2', requiredRole: 'PMO' },
        ],
      });

      expect(result).toBeDefined();
    });
  });

  describe('reorderSteps', () => {
    it('should reorder steps preserving contiguous positions', async () => {
      const steps = [
        makeStep({ id: 's1', stepOrder: 1 }),
        makeStep({ id: 's2', stepOrder: 2 }),
        makeStep({ id: 's3', stepOrder: 3 }),
      ];
      chainRepo.findOne
        .mockResolvedValueOnce(makeChain({ steps }))
        .mockResolvedValueOnce(makeChain({ steps })); // second call from return

      await service.reorderSteps(auth, WS_ID, CHAIN_ID, {
        stepIds: ['s3', 's1', 's2'],
      });

      expect(stepRepo.update).toHaveBeenCalledTimes(3);
      expect(stepRepo.update).toHaveBeenCalledWith({ id: 's3', chainId: CHAIN_ID }, { stepOrder: 1 });
      expect(stepRepo.update).toHaveBeenCalledWith({ id: 's1', chainId: CHAIN_ID }, { stepOrder: 2 });
      expect(stepRepo.update).toHaveBeenCalledWith({ id: 's2', chainId: CHAIN_ID }, { stepOrder: 3 });
    });

    it('should reject if stepIds mismatch', async () => {
      const steps = [
        makeStep({ id: 's1', stepOrder: 1 }),
        makeStep({ id: 's2', stepOrder: 2 }),
      ];
      chainRepo.findOne.mockResolvedValue(makeChain({ steps }));

      await expect(
        service.reorderSteps(auth, WS_ID, CHAIN_ID, { stepIds: ['s1'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getChainForGateDefinition', () => {
    it('should return null when no chain exists (backward compat)', async () => {
      chainRepo.findOne.mockResolvedValue(null);

      const result = await service.getChainForGateDefinition(auth, WS_ID, GATE_DEF_ID);

      expect(result).toBeNull();
    });

    it('should return chain with sorted steps', async () => {
      const steps = [
        makeStep({ id: 's2', stepOrder: 2 }),
        makeStep({ id: 's1', stepOrder: 1 }),
      ];
      chainRepo.findOne.mockResolvedValue(makeChain({ steps }));

      const result = await service.getChainForGateDefinition(auth, WS_ID, GATE_DEF_ID);

      expect(result).not.toBeNull();
      expect(result!.steps[0].stepOrder).toBe(1);
      expect(result!.steps[1].stepOrder).toBe(2);
    });
  });

  describe('deleteChain', () => {
    it('should soft-delete the chain', async () => {
      chainRepo.findOne.mockResolvedValue(makeChain());

      await service.deleteChain(auth, WS_ID, CHAIN_ID);

      expect(chainRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });
  });
});
