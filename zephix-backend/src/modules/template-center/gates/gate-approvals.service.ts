import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { DocumentInstance } from '../documents/entities/document-instance.entity';
import { ProjectKpi } from '../kpis/entities/project-kpi.entity';
import { GateApproval } from './entities/gate-approval.entity';
import { TemplateCenterAuditService } from '../audit/audit-events.service';
import { GateDecideDto } from './dto/gate-decide.dto';
import { isTemplateCenterEnabled } from '../template-center.flags';

export interface GateBlocker {
  type: 'document' | 'kpi';
  key?: string;
  reason: string;
}

export interface GateRequirements {
  requiredDocKeys: string[];
  requiredKpiKeys: string[];
  requiredDocStates: string[];
  requireAllKpis: boolean;
  templateKey?: string;
}

export interface GateDecideResult {
  decided: boolean;
  gateKey: string;
  decision: string;
  approvalId: string;
}

@Injectable()
export class GateApprovalsService {
  private readonly logger = new Logger(GateApprovalsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(DocumentInstance)
    private readonly docInstanceRepo: Repository<DocumentInstance>,
    @InjectRepository(ProjectKpi)
    private readonly projectKpiRepo: Repository<ProjectKpi>,
    @InjectRepository(GateApproval)
    private readonly gateApprovalRepo: Repository<GateApproval>,
    private readonly auditService: TemplateCenterAuditService,
  ) {}

  async getBlockers(
    projectId: string,
    gateKey: string,
    requirements: GateRequirements,
  ): Promise<GateBlocker[]> {
    const blockers: GateBlocker[] = [];
    const { requiredDocKeys, requiredKpiKeys, requiredDocStates } = requirements;
    const allowedDocStates = new Set(requiredDocStates);

    if (requiredDocKeys.length > 0) {
      const docs = await this.docInstanceRepo.find({
        where: { projectId },
      });
      const byKey = new Map(docs.map((d) => [d.docKey, d]));
      for (const key of requiredDocKeys) {
        const doc = byKey.get(key);
        if (!doc) {
          blockers.push({ type: 'document', key, reason: 'missing_doc_instance' });
        } else if (!allowedDocStates.has(doc.status)) {
          blockers.push({
            type: 'document',
            key,
            reason: 'doc_state_invalid',
          });
        }
      }
    }
    if (requiredKpiKeys.length > 0) {
      const kpis = await this.projectKpiRepo.find({
        where: { projectId },
        relations: ['kpiDefinition'],
      });
      const byKey = new Map(
        kpis.filter((pk) => pk.kpiDefinition).map((pk) => [pk.kpiDefinition!.kpiKey, pk]),
      );
      for (const key of requiredKpiKeys) {
        if (!byKey.has(key)) {
          blockers.push({ type: 'kpi', key, reason: 'missing_project_kpi' });
        }
      }
    }
    return blockers;
  }

  async decide(
    projectId: string,
    gateKey: string,
    dto: GateDecideDto,
    userId: string,
    organizationId: string,
    workspaceId: string | null,
    requirements: GateRequirements,
  ): Promise<GateDecideResult> {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }

    this.logger.log(
      JSON.stringify({
        event: 'gate_decision_attempted',
        projectId,
        gateKey,
        decision: dto.decision,
      }),
    );
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'organizationId', 'workspaceId'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('Project does not belong to your organization');
    }
    if (workspaceId && project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Project does not belong to this workspace');
    }

    if (dto.decision === 'approved' || dto.decision === 'approved_with_comments') {
      const blockers = await this.getBlockers(projectId, gateKey, requirements);
      if (blockers.length > 0) {
        await this.auditService.emit({
          eventType: 'GATE_DECIDE_BLOCKED',
          entityType: 'GATE_APPROVAL',
          entityId: null,
          userId,
          projectId,
          workspaceId: project.workspaceId ?? null,
          newState: {
            templateKey: requirements.templateKey ?? '',
            projectId,
            gateKey,
            errorCode: 'gate_blocked',
            errorMessage: `Blockers: ${blockers.map((b) => b.reason).join(', ')}`.slice(0, 500),
          },
          metadata: { blockers: blockers.length },
        });
        throw new ConflictException({
          code: 'gate_blocked',
          gateKey,
          blockers: blockers.map((b) => ({
            type: b.type,
            key: b.key,
            reason: b.reason,
          })),
        });
      }
    }

    const approval = this.gateApprovalRepo.create({
      projectId,
      gateKey,
      decision: dto.decision,
      comment: dto.comment ?? null,
      evidence: dto.evidence ?? null,
      decidedBy: userId,
    });
    const saved = await this.gateApprovalRepo.save(approval);

    await this.auditService.emit({
      eventType: 'GATE_DECIDE',
      entityType: 'GATE_APPROVAL',
      entityId: saved.id,
      userId,
      projectId,
      workspaceId: project.workspaceId ?? null,
      newState: { gateKey, decision: dto.decision },
      metadata: { comment: dto.comment },
    });

    return {
      decided: true,
      gateKey,
      decision: dto.decision,
      approvalId: saved.id,
    };
  }
}
