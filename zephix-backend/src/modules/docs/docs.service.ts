import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doc } from './entities/doc.entity';
import { CreateDocDto } from './dto/create-doc.dto';
import { UpdateDocDto } from './dto/update-doc.dto';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';

@Injectable()
export class DocsService {
  constructor(
    @InjectRepository(Doc)
    private docRepository: Repository<Doc>,
    private workspaceAccessService: WorkspaceAccessService,
  ) {}

  async create(
    workspaceId: string,
    createDocDto: CreateDocDto,
    userId: string,
    organizationId: string,
    platformRole: string,
  ): Promise<Doc> {
    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );

    if (!canAccess) {
      throw new ForbiddenException('Workspace access denied');
    }

    // Check write permission (member or owner)
    const role = await this.workspaceAccessService.getUserWorkspaceRole(
      organizationId,
      workspaceId,
      userId,
      platformRole,
    );

    if (!role || (role !== 'workspace_owner' && role !== 'workspace_member')) {
      throw new ForbiddenException('Write access denied');
    }

    const doc = this.docRepository.create({
      workspaceId,
      title: createDocDto.title,
      content: '',
    });

    return await this.docRepository.save(doc);
  }

  async findOne(
    docId: string,
    userId: string,
    organizationId: string,
    platformRole: string,
  ): Promise<Doc> {
    const doc = await this.docRepository.findOne({
      where: { id: docId },
    });

    if (!doc) {
      throw new NotFoundException('Doc not found');
    }

    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      doc.workspaceId,
      organizationId,
      userId,
      platformRole,
    );

    if (!canAccess) {
      throw new ForbiddenException('Workspace access denied');
    }

    return doc;
  }

  async update(
    docId: string,
    updateDocDto: UpdateDocDto,
    userId: string,
    organizationId: string,
    platformRole: string,
  ): Promise<Doc> {
    const doc = await this.findOne(docId, userId, organizationId, platformRole);

    // Verify write access
    const role = await this.workspaceAccessService.getUserWorkspaceRole(
      organizationId,
      doc.workspaceId,
      userId,
      platformRole,
    );

    if (!role || (role !== 'workspace_owner' && role !== 'workspace_member')) {
      throw new ForbiddenException('Write access denied');
    }

    if (updateDocDto.title !== undefined) {
      doc.title = updateDocDto.title;
    }
    if (updateDocDto.content !== undefined) {
      doc.content = updateDocDto.content;
    }

    return await this.docRepository.save(doc);
  }
}
