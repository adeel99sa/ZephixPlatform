/**
 * TC-B6 — Attach a catalog document to a project.
 *
 * POST /api/projects/:projectId/documents/from-template → creates a
 * document_instance (draft, resolved content as version 1). Optionally wires
 * an evidence requirement onto an existing project gate (blocksGateKey).
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { DocTemplate } from './entities/doc-template.entity';
import { PhaseGateDefinition } from '../../work-management/entities/phase-gate-definition.entity';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';
import { DOCUMENT_CATALOG_BY_KEY } from './data/document-catalog';
import { materializeDocumentInstance } from './document-materialization';

export interface AttachDocumentResult {
  id: string;
  projectId: string;
  docKey: string;
  title: string;
  status: string;
  version: number;
  blocksGateKey: string | null;
  /** Merge tokens present in the content that could not be resolved. */
  unresolvedFields: string[];
}

@Injectable()
export class DocumentAttachService {
  private readonly logger = new Logger(DocumentAttachService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(DocTemplate)
    private readonly docTemplateRepo: Repository<DocTemplate>,
    @InjectRepository(PhaseGateDefinition)
    private readonly gateDefRepo: Repository<PhaseGateDefinition>,
  ) {}

  private async assertProjectAccess(
    projectId: string,
    organizationId: string,
    workspaceId?: string | null,
  ): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    // Cross-org access must return 403, not 404.
    if (project.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Project does not belong to your organization',
      );
    }
    if (workspaceId != null && project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Project does not belong to this workspace');
    }
    return project;
  }

  async attachFromTemplate(
    projectId: string,
    input: { docKey: string; blocksGateKey?: string | null },
    userId: string,
    organizationId: string,
    workspaceId: string | null,
    actorPlatformRole?: string,
  ): Promise<AttachDocumentResult> {
    const project = await this.assertProjectAccess(
      projectId,
      organizationId,
      workspaceId,
    );

    // Resolve the document template. It must be a known catalog key AND have a
    // live doc_templates content row (seeded).
    if (!DOCUMENT_CATALOG_BY_KEY[input.docKey]) {
      throw new NotFoundException(`Unknown document key: ${input.docKey}`);
    }
    const docTemplate = await this.docTemplateRepo.findOne({
      where: { docKey: input.docKey, isActive: true },
    });
    if (!docTemplate) {
      throw new NotFoundException(
        `Document template not found for key: ${input.docKey}`,
      );
    }

    // Validate blocksGateKey — it must reference an existing gate on THIS
    // project (a document cannot block a gate that does not exist).
    const blocksGateKey = input.blocksGateKey?.trim() || null;
    if (blocksGateKey) {
      const gate = await this.gateDefRepo.findOne({
        where: {
          projectId: project.id,
          gateKey: blocksGateKey,
          deletedAt: IsNull(),
        },
      });
      if (!gate) {
        throw new BadRequestException(
          `Gate key "${blocksGateKey}" is not defined on this project`,
        );
      }
    }

    const { instance, unresolvedFields } = await this.dataSource.transaction(
      (manager) =>
        materializeDocumentInstance(manager, {
          project,
          docTemplate,
          ownerId: userId,
          blocksGateKey,
          status: 'draft',
        }),
    );

    await this.auditService.record({
      organizationId,
      workspaceId,
      actorUserId: userId,
      actorPlatformRole,
      entityType: AuditEntityType.DOCUMENT_INSTANCE,
      entityId: instance.id,
      action: AuditAction.CREATE,
      after: {
        projectId: project.id,
        docKey: instance.docKey,
        blocksGateKey,
        source: 'from_template',
        unresolvedFields,
      },
      metadata: null,
    });

    this.logger.log(
      JSON.stringify({
        event: 'document_attached_from_template',
        projectId: project.id,
        documentId: instance.id,
        docKey: instance.docKey,
        blocksGateKey,
        unresolvedCount: unresolvedFields.length,
      }),
    );

    return {
      id: instance.id,
      projectId: instance.projectId,
      docKey: instance.docKey,
      title: instance.name,
      status: instance.status,
      version: instance.currentVersion,
      blocksGateKey: instance.blocksGateKey ?? null,
      unresolvedFields,
    };
  }
}
