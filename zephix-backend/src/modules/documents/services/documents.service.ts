import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { DocumentEntity } from '../entities/document.entity';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';

/**
 * DOC-TENANT-1: this service now uses TenantAwareRepository, so every read is
 * automatically scoped by organizationId (and workspaceId, since DocumentEntity
 * is @WorkspaceScoped) from the request tenant context. The explicit
 * workspaceId/projectId filters remain as belt-and-suspenders and to enforce
 * the project scope. Cross-org access is blocked at the data layer even if a
 * caller supplies a divergent URL workspace/project.
 */
@Injectable()
export class DocumentsService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(DocumentEntity))
    private readonly repo: TenantAwareRepository<DocumentEntity>,
    private readonly tenantContext: TenantContextService,
  ) {}

  async list(workspaceId: string, projectId: string) {
    return this.repo.find({
      where: { workspaceId, projectId },
      order: { updatedAt: 'DESC' },
    });
  }

  async get(workspaceId: string, projectId: string, id: string) {
    const row = await this.repo.findOne({
      where: { id, workspaceId, projectId },
    });
    if (!row) throw new NotFoundException('DOCUMENT_NOT_FOUND');
    return row;
  }

  async create(
    workspaceId: string,
    projectId: string,
    dto: CreateDocumentDto,
    userId: string,
  ) {
    const organizationId = this.tenantContext.assertOrganizationId();
    const row = this.repo.create({
      organizationId,
      workspaceId,
      projectId,
      title: dto.title,
      content: dto.content ?? {},
      version: 1,
      createdByUserId: userId,
    });
    return this.repo.save(row);
  }

  async update(
    workspaceId: string,
    projectId: string,
    id: string,
    dto: UpdateDocumentDto,
  ) {
    const row = await this.get(workspaceId, projectId, id);

    if (dto.title !== undefined) row.title = dto.title;
    if (dto.content !== undefined) row.content = dto.content;

    // Increment version on every update
    row.version = row.version + 1;

    return this.repo.save(row);
  }

  async remove(workspaceId: string, projectId: string, id: string) {
    const row = await this.get(workspaceId, projectId, id);
    await this.repo.delete({ id: row.id, workspaceId, projectId });
    return { deleted: true };
  }
}
