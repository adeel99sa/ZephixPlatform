import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, EntityManager } from 'typeorm';
import { GateApprovalChain } from '../entities/gate-approval-chain.entity';
import { GateApprovalChainStep, ApprovalType } from '../entities/gate-approval-chain-step.entity';
import { PhaseGateDefinition } from '../entities/phase-gate-definition.entity';
import { PoliciesService } from '../../policies/services/policies.service';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

export interface CreateChainDto {
  gateDefinitionId: string;
  name: string;
  description?: string;
  steps: CreateStepDto[];
}

export interface CreateStepDto {
  name: string;
  description?: string;
  requiredRole?: string;
  requiredUserId?: string;
  approvalType?: ApprovalType;
  minApprovals?: number;
  autoApproveAfterHours?: number;
}

export interface ReorderStepsDto {
  /** Ordered array of step IDs in the desired order */
  stepIds: string[];
}

@Injectable()
export class GateApprovalChainService {
  private readonly logger = new Logger(GateApprovalChainService.name);

  constructor(
    @InjectRepository(GateApprovalChain)
    private readonly chainRepo: Repository<GateApprovalChain>,
    @InjectRepository(GateApprovalChainStep)
    private readonly stepRepo: Repository<GateApprovalChainStep>,
    @InjectRepository(PhaseGateDefinition)
    private readonly gateDefRepo: Repository<PhaseGateDefinition>,
    private readonly policiesService: PoliciesService,
  ) {}

  /**
   * Create or replace chain for a gate definition.
   * One active chain per gate definition enforced by unique constraint.
   */
  async createChain(
    auth: AuthContext,
    workspaceId: string,
    dto: CreateChainDto,
  ): Promise<GateApprovalChain> {
    const { organizationId, userId } = auth;

    // Verify gate definition belongs to this org + workspace
    const gateDef = await this.gateDefRepo.findOne({
      where: {
        id: dto.gateDefinitionId,
        organizationId,
        workspaceId,
      },
    });
    if (!gateDef) {
      throw new NotFoundException('Gate definition not found');
    }

    // Check min steps policy
    const minSteps = await this.policiesService.resolvePolicy<number>(
      organizationId,
      workspaceId,
      'phase_gate_approval_min_steps',
      gateDef.projectId,
    );
    if (minSteps != null && dto.steps.length < minSteps) {
      throw new BadRequestException(
        `Approval chain requires at least ${minSteps} steps (policy: phase_gate_approval_min_steps)`,
      );
    }

    // Validate each step has at least one target
    for (const step of dto.steps) {
      if (!step.requiredRole && !step.requiredUserId) {
        throw new BadRequestException('Each step must have either a requiredRole or requiredUserId');
      }
    }

    // Soft-delete existing chain if present
    const existingChain = await this.chainRepo.findOne({
      where: {
        gateDefinitionId: dto.gateDefinitionId,
        organizationId,
        deletedAt: IsNull(),
      },
    });
    if (existingChain) {
      existingChain.deletedAt = new Date();
      await this.chainRepo.save(existingChain);
    }

    // Create new chain
    const chain = this.chainRepo.create({
      organizationId,
      workspaceId,
      gateDefinitionId: dto.gateDefinitionId,
      name: dto.name,
      description: dto.description ?? null,
      isActive: true,
      createdByUserId: userId,
    });
    const savedChain = await this.chainRepo.save(chain);

    // Create steps with ordered positions
    const steps = dto.steps.map((s, index) =>
      this.stepRepo.create({
        organizationId,
        chainId: savedChain.id,
        stepOrder: index + 1,
        name: s.name,
        description: s.description ?? null,
        requiredRole: s.requiredRole ?? null,
        requiredUserId: s.requiredUserId ?? null,
        approvalType: s.approvalType ?? ApprovalType.ANY_ONE,
        minApprovals: s.minApprovals ?? 1,
        autoApproveAfterHours: s.autoApproveAfterHours ?? null,
      }),
    );
    await this.stepRepo.save(steps);

    return this.getChainById(auth, workspaceId, savedChain.id);
  }

  /** Fixed shape of the default one-step chain seeded on gate-def creation. */
  static readonly DEFAULT_CHAIN_NAME = 'Default approval';
  static readonly DEFAULT_STEP_NAME = 'Admin approval';
  static readonly DEFAULT_STEP_ROLE = 'ADMIN';

  /**
   * GATE-SUB-2: seed the default one-step ADMIN approval chain for a gate
   * definition, co-committed with the caller's transaction (gate def + chain
   * land together or not at all). Idempotent — if an active chain already
   * exists for the gate def it is a no-op, so backfill / re-runs never dupe.
   *
   * This is the MINIMUM approvable unit: one step, ANY_ONE, min 1, required
   * role ADMIN (a wildcard approver; the self-approve ban still applies).
   * No ladder, no timeout, no reviewers_role_policy — those are GOV-BUILD.
   */
  async createDefaultChain(
    params: {
      organizationId: string;
      workspaceId: string;
      gateDefinitionId: string;
      createdByUserId: string;
    },
    manager: EntityManager,
  ): Promise<GateApprovalChain> {
    const chainRepo = manager.getRepository(GateApprovalChain);
    const stepRepo = manager.getRepository(GateApprovalChainStep);

    // Idempotency guard — never a second active chain for the same gate def.
    const existing = await chainRepo.findOne({
      where: {
        gateDefinitionId: params.gateDefinitionId,
        organizationId: params.organizationId,
        deletedAt: IsNull(),
        isActive: true,
      },
    });
    if (existing) return existing;

    const chain = await chainRepo.save(
      chainRepo.create({
        organizationId: params.organizationId,
        workspaceId: params.workspaceId,
        gateDefinitionId: params.gateDefinitionId,
        name: GateApprovalChainService.DEFAULT_CHAIN_NAME,
        isActive: true,
        createdByUserId: params.createdByUserId,
      }),
    );

    await stepRepo.save(
      stepRepo.create({
        organizationId: params.organizationId,
        chainId: chain.id,
        stepOrder: 1,
        name: GateApprovalChainService.DEFAULT_STEP_NAME,
        requiredRole: GateApprovalChainService.DEFAULT_STEP_ROLE,
        approvalType: ApprovalType.ANY_ONE,
        minApprovals: 1,
      }),
    );

    return chain;
  }

  /**
   * Get chain by ID with steps loaded.
   */
  async getChainById(
    auth: AuthContext,
    workspaceId: string,
    chainId: string,
  ): Promise<GateApprovalChain> {
    const chain = await this.chainRepo.findOne({
      where: {
        id: chainId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
      relations: ['steps'],
    });
    if (!chain) {
      throw new NotFoundException('Approval chain not found');
    }
    // Sort steps by order
    chain.steps = (chain.steps || []).sort((a, b) => a.stepOrder - b.stepOrder);
    return chain;
  }

  /**
   * Get chain for a gate definition (if any).
   * Returns null if no active chain exists (backward compatibility).
   */
  async getChainForGateDefinition(
    auth: AuthContext,
    workspaceId: string,
    gateDefinitionId: string,
  ): Promise<GateApprovalChain | null> {
    const chain = await this.chainRepo.findOne({
      where: {
        gateDefinitionId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
        isActive: true,
      },
      relations: ['steps'],
    });
    if (!chain) return null;
    chain.steps = (chain.steps || []).sort((a, b) => a.stepOrder - b.stepOrder);
    return chain;
  }

  /**
   * Reorder steps within a chain. stepIds must contain all step IDs exactly once.
   */
  async reorderSteps(
    auth: AuthContext,
    workspaceId: string,
    chainId: string,
    dto: ReorderStepsDto,
  ): Promise<GateApprovalChain> {
    const chain = await this.getChainById(auth, workspaceId, chainId);

    const existingIds = new Set(chain.steps.map((s) => s.id));
    const providedIds = new Set(dto.stepIds);

    if (existingIds.size !== providedIds.size) {
      throw new BadRequestException('stepIds must contain all existing step IDs exactly once');
    }
    for (const id of dto.stepIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Step ID ${id} not found in chain`);
      }
    }

    // Update step orders
    const updates = dto.stepIds.map((stepId, index) => ({
      id: stepId,
      stepOrder: index + 1,
    }));
    for (const update of updates) {
      await this.stepRepo.update(
        { id: update.id, chainId: chain.id },
        { stepOrder: update.stepOrder },
      );
    }

    return this.getChainById(auth, workspaceId, chainId);
  }

  /**
   * Delete a chain (soft delete).
   */
  async deleteChain(
    auth: AuthContext,
    workspaceId: string,
    chainId: string,
  ): Promise<void> {
    const chain = await this.getChainById(auth, workspaceId, chainId);
    chain.deletedAt = new Date();
    await this.chainRepo.save(chain);
  }
}
