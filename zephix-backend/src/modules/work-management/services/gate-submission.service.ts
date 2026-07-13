import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import {
  GateSubmissionStatus,
  PhaseGateSubmission,
} from '../entities/phase-gate-submission.entity';
import {
  GateDefinitionStatus,
  PhaseGateDefinition,
} from '../entities/phase-gate-definition.entity';

export interface OpenDraftInput {
  organizationId: string;
  workspaceId: string;
  projectId: string;
  phaseId: string;
  /** Optional; resolved from the phase's ACTIVE gate definition when absent. */
  gateDefinitionId?: string;
  actorUserId: string;
}

export interface OpenDraftResult {
  submission: PhaseGateSubmission;
  /** true = a brand-new row was inserted; false = an existing open row reused. */
  created: boolean;
  /** true = an existing REJECTED row was transitioned back to DRAFT. */
  reopened: boolean;
}

/**
 * GATE-SUB-1 — the missing connector.
 *
 * The phase-gate submission lifecycle (submit → evidence → approve/chain →
 * isPhaseGateBlocking clears at APPROVED) was fully built EXCEPT the entry
 * point: nothing created the initial DRAFT row. This lean service is that
 * entry point and nothing more — it does not enforce reviewers/documents/
 * checklists/thresholds (all dormant, GOV-BUILD territory).
 *
 * Idempotent by contract: one open submission per (project, phase, gate
 * definition). A retry — or an existing DRAFT/SUBMITTED/REJECTED — reuses the
 * same row; a REJECTED row is transitioned back to DRAFT (valid per
 * GATE_TRANSITIONS), never duplicated.
 */
@Injectable()
export class GateSubmissionService {
  private readonly logger = new Logger(GateSubmissionService.name);

  /** Statuses that count as an already-open submission (not terminal/closed). */
  private static readonly OPEN_STATUSES: GateSubmissionStatus[] = [
    GateSubmissionStatus.DRAFT,
    GateSubmissionStatus.SUBMITTED,
    GateSubmissionStatus.REJECTED,
  ];

  constructor(
    @InjectRepository(PhaseGateSubmission)
    private readonly submissionRepo: Repository<PhaseGateSubmission>,
    @InjectRepository(PhaseGateDefinition)
    private readonly gateDefRepo: Repository<PhaseGateDefinition>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Open (or reuse) the DRAFT submission for a phase gate.
   *
   * @param manager Optional caller transaction. When supplied the work runs on
   *   that manager so it co-commits with the caller (e.g. the block path's
   *   exception auto-create). When omitted, runs in its own transaction.
   */
  async openDraft(
    input: OpenDraftInput,
    manager?: EntityManager,
  ): Promise<OpenDraftResult> {
    if (manager) {
      return this.openDraftInTx(input, manager);
    }
    return this.dataSource.transaction((mgr) =>
      this.openDraftInTx(input, mgr),
    );
  }

  private async openDraftInTx(
    input: OpenDraftInput,
    mgr: EntityManager,
  ): Promise<OpenDraftResult> {
    const subRepo = mgr.getRepository(PhaseGateSubmission);
    const defRepo = mgr.getRepository(PhaseGateDefinition);

    // Resolve the gate definition (one ACTIVE def per phase — uq_pgd_phase_id).
    let gateDefinitionId = input.gateDefinitionId;
    if (!gateDefinitionId) {
      const def = await defRepo.findOne({
        where: {
          organizationId: input.organizationId,
          phaseId: input.phaseId,
          status: GateDefinitionStatus.ACTIVE,
          deletedAt: IsNull(),
        },
        select: ['id'],
      });
      if (!def) {
        throw new NotFoundException({
          code: 'GATE_DEFINITION_NOT_FOUND',
          message: 'No active phase gate definition exists for this phase',
        });
      }
      gateDefinitionId = def.id;
    }

    // Idempotency: reuse the newest open submission if one exists.
    const existing = await subRepo.findOne({
      where: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        phaseId: input.phaseId,
        gateDefinitionId,
        status: In(GateSubmissionService.OPEN_STATUSES),
        deletedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });

    if (existing) {
      if (existing.status === GateSubmissionStatus.REJECTED) {
        // REJECTED → DRAFT is the sanctioned resubmit edge. Reuse, don't dupe;
        // clear the stale rejection decision so the DRAFT is honestly blank.
        existing.status = GateSubmissionStatus.DRAFT;
        existing.decisionByUserId = null;
        existing.decidedAt = null;
        existing.decisionNote = null;
        const reopened = await subRepo.save(existing);
        return { submission: reopened, created: false, reopened: true };
      }
      return { submission: existing, created: false, reopened: false };
    }

    const draft = subRepo.create({
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      phaseId: input.phaseId,
      gateDefinitionId,
      status: GateSubmissionStatus.DRAFT,
      createdByUserId: input.actorUserId,
    });
    const saved = await subRepo.save(draft);
    return { submission: saved, created: true, reopened: false };
  }
}
