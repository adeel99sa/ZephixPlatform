import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { DocumentInstance } from './entities/document-instance.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { TemplateCenterAuditService } from '../audit/audit-events.service';
import { DocumentTransitionDto } from './dto/document-transition.dto';
import type {
  DocumentInstanceSummaryDto,
  DocumentLatestDto,
  DocumentHistoryItemDto,
} from './dto/document-read.dto';

const TRANSITIONS: Record<
  string,
  Record<string, { next: string[]; allowedRoles: string[] }>
> = {
  not_started: {
    start_draft: { next: ['draft'], allowedRoles: ['owner'] },
  },
  draft: {
    submit_for_review: { next: ['in_review'], allowedRoles: ['owner'] },
  },
  in_review: {
    approve: { next: ['approved'], allowedRoles: ['reviewer'] },
    request_changes: { next: ['draft'], allowedRoles: ['reviewer'] },
  },
  approved: {
    mark_complete: { next: ['completed'], allowedRoles: ['owner', 'pm'] },
  },
  completed: {
    create_new_version: { next: ['draft'], allowedRoles: ['owner'] },
  },
  superseded: {},
};

const ACTION_TO_TRANSITION: Record<string, string> = {
  start_draft: 'start_draft',
  submit_for_review: 'submit_for_review',
  approve: 'approve',
  request_changes: 'request_changes',
  mark_complete: 'mark_complete',
  create_new_version: 'create_new_version',
};

@Injectable()
export class DocumentLifecycleService {
  private readonly logger = new Logger(DocumentLifecycleService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: TemplateCenterAuditService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(DocumentInstance)
    private readonly docInstanceRepo: Repository<DocumentInstance>,
    @InjectRepository(DocumentVersion)
    private readonly docVersionRepo: Repository<DocumentVersion>,
  ) {}

  private async assertProjectAccess(
    projectId: string,
    organizationId: string,
    workspaceId?: string | null,
  ): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'organizationId', 'workspaceId'],
    });
    if (!project) throw new NotFoundException('Project not found');
    // Cross-org access must return 403, not 404
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

  async transition(
    projectId: string,
    documentId: string,
    dto: DocumentTransitionDto,
    userId: string,
    organizationId: string,
    workspaceId: string | null,
    isPm: boolean,
  ): Promise<DocumentInstance> {
    const doc = await this.docInstanceRepo.findOne({
      where: { id: documentId, projectId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    this.logger.log(
      JSON.stringify({
        event: 'document_transition_attempted',
        projectId,
        documentId,
        action: dto.action,
      }),
    );
    const transitionKey = ACTION_TO_TRANSITION[dto.action];
    if (!transitionKey) {
      await this.auditService.emit({
        eventType: 'DOCUMENT_TRANSITION_FAILED',
        entityType: 'DOCUMENT_INSTANCE',
        entityId: documentId,
        userId,
        projectId,
        workspaceId,
        newState: {
          projectId,
          documentId,
          errorCode: 'INVALID_ACTION',
          errorMessage: `Invalid action: ${dto.action}`.slice(0, 500),
        },
        metadata: null,
      });
      throw new BadRequestException(`Invalid action: ${dto.action}`);
    }
    const fromStatus = doc.status;
    const rules = TRANSITIONS[fromStatus]?.[transitionKey];
    if (!rules) {
      await this.auditService.emit({
        eventType: 'DOCUMENT_TRANSITION_FAILED',
        entityType: 'DOCUMENT_INSTANCE',
        entityId: documentId,
        userId,
        projectId,
        workspaceId,
        newState: {
          projectId,
          documentId,
          errorCode: 'INVALID_STATE_TRANSITION',
          errorMessage:
            `Transition from "${fromStatus}" via "${dto.action}" not allowed`.slice(
              0,
              500,
            ),
        },
        metadata: null,
      });
      throw new BadRequestException(
        `Transition from "${fromStatus}" via "${dto.action}" is not allowed`,
      );
    }
    const nextStatus = rules.next[0];
    const isOwner = doc.ownerId === userId;
    const isReviewer = doc.reviewerIds?.includes(userId) ?? false;
    const canAct =
      (rules.allowedRoles.includes('owner') && isOwner) ||
      (rules.allowedRoles.includes('reviewer') && isReviewer) ||
      (rules.allowedRoles.includes('pm') && isPm);
    if (!canAct) {
      await this.auditService.emit({
        eventType: 'DOCUMENT_TRANSITION_FAILED',
        entityType: 'DOCUMENT_INSTANCE',
        entityId: documentId,
        userId,
        projectId,
        workspaceId,
        newState: {
          projectId,
          documentId,
          errorCode: 'FORBIDDEN',
          errorMessage: 'Permission denied for this transition'.slice(0, 500),
        },
        metadata: null,
      });
      throw new ForbiddenException(
        'You do not have permission to perform this transition',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const docRepo = manager.getRepository(DocumentInstance);
      const versionRepo = manager.getRepository(DocumentVersion);
      const entity = await docRepo.findOne({ where: { id: documentId } });
      if (!entity) throw new NotFoundException('Document not found');

      const oldStatus = entity.status;
      entity.status = nextStatus;
      if (nextStatus === 'completed' && dto.action === 'mark_complete') {
        entity.completedAt = new Date();
        entity.completedBy = userId;
      }
      if (nextStatus === 'draft' && dto.action === 'create_new_version') {
        entity.currentVersion += 1;
      }
      await docRepo.save(entity);

      if (
        dto.content !== undefined ||
        dto.changeSummary ||
        dto.externalUrl ||
        dto.fileStorageKey
      ) {
        const version = versionRepo.create({
          documentInstanceId: entity.id,
          versionNumber: entity.currentVersion,
          content: dto.content ?? null,
          changeSummary: dto.changeSummary ?? null,
          externalUrl: dto.externalUrl ?? null,
          fileStorageKey: dto.fileStorageKey ?? null,
          createdBy: userId,
        });
        await versionRepo.save(version);
      }

      return entity;
    });

    await this.auditService.emit({
      eventType: 'DOC_TRANSITION',
      entityType: 'DOCUMENT_INSTANCE',
      entityId: documentId,
      userId,
      projectId,
      workspaceId,
      oldState: { status: fromStatus },
      newState: { status: nextStatus, action: dto.action },
      metadata: { changeSummary: dto.changeSummary },
    });

    return result;
  }

  async listProjectDocuments(
    projectId: string,
    organizationId: string,
    workspaceId?: string | null,
  ): Promise<DocumentInstanceSummaryDto[]> {
    await this.assertProjectAccess(projectId, organizationId, workspaceId);
    const docs = await this.docInstanceRepo.find({
      where: { projectId },
      order: { updatedAt: 'DESC' },
    });
    return docs.map((d) => ({
      id: d.id,
      projectId: d.projectId,
      docKey: d.docKey,
      title: d.name,
      status: d.status,
      version: d.currentVersion,
      ownerUserId: d.ownerId,
      reviewerUserId: d.reviewerIds?.[0] ?? null,
      updatedAt: d.updatedAt.toISOString(),
    }));
  }

  async getLatest(
    projectId: string,
    documentId: string,
    organizationId: string,
    workspaceId?: string | null,
  ): Promise<DocumentLatestDto> {
    await this.assertProjectAccess(projectId, organizationId, workspaceId);
    const doc = await this.docInstanceRepo.findOne({
      where: { id: documentId, projectId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const latestVersion = await this.docVersionRepo.findOne({
      where: { documentInstanceId: doc.id },
      order: { versionNumber: 'DESC' },
    });
    return {
      id: doc.id,
      projectId: doc.projectId,
      docKey: doc.docKey,
      title: doc.name,
      status: doc.status,
      version: doc.currentVersion,
      content: latestVersion?.content ?? null,
      externalUrl: latestVersion?.externalUrl ?? null,
      fileStorageKey: latestVersion?.fileStorageKey ?? null,
      changeSummary: latestVersion?.changeSummary ?? null,
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async getHistory(
    projectId: string,
    documentId: string,
    organizationId: string,
    workspaceId?: string | null,
  ): Promise<DocumentHistoryItemDto[]> {
    await this.assertProjectAccess(projectId, organizationId, workspaceId);
    const doc = await this.docInstanceRepo.findOne({
      where: { id: documentId, projectId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const versions = await this.docVersionRepo.find({
      where: { documentInstanceId: doc.id },
      order: { versionNumber: 'DESC' },
    });
    return versions.map((v) => ({
      version: v.versionNumber,
      status: doc.status,
      changeSummary: v.changeSummary ?? null,
      createdAt: v.createdAt.toISOString(),
      createdBy: v.createdBy ?? null,
    }));
  }

  async assign(
    projectId: string,
    documentId: string,
    payload: { ownerUserId?: string; reviewerUserId?: string },
    userId: string,
    organizationId: string,
    workspaceId?: string | null,
  ): Promise<DocumentInstance> {
    await this.assertProjectAccess(projectId, organizationId, workspaceId);
    const doc = await this.docInstanceRepo.findOne({
      where: { id: documentId, projectId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (payload.ownerUserId != null) doc.ownerId = payload.ownerUserId;
    if (payload.reviewerUserId != null)
      doc.reviewerIds = [payload.reviewerUserId];
    return this.docInstanceRepo.save(doc);
  }
}
