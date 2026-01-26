import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from './entities/form.entity';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Form)
    private formRepository: Repository<Form>,
    private workspaceAccessService: WorkspaceAccessService,
  ) {}

  async create(
    workspaceId: string,
    createFormDto: CreateFormDto,
    userId: string,
    organizationId: string,
    platformRole: string,
  ): Promise<Form> {
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

    const form = this.formRepository.create({
      workspaceId,
      title: createFormDto.title,
      schema: null,
    });

    return await this.formRepository.save(form);
  }

  async findOne(
    formId: string,
    userId: string,
    organizationId: string,
    platformRole: string,
  ): Promise<Form> {
    const form = await this.formRepository.findOne({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      form.workspaceId,
      organizationId,
      userId,
      platformRole,
    );

    if (!canAccess) {
      throw new ForbiddenException('Workspace access denied');
    }

    return form;
  }

  async update(
    formId: string,
    updateFormDto: UpdateFormDto,
    userId: string,
    organizationId: string,
    platformRole: string,
  ): Promise<Form> {
    const form = await this.findOne(
      formId,
      userId,
      organizationId,
      platformRole,
    );

    // Verify write access
    const role = await this.workspaceAccessService.getUserWorkspaceRole(
      organizationId,
      form.workspaceId,
      userId,
      platformRole,
    );

    if (!role || (role !== 'workspace_owner' && role !== 'workspace_member')) {
      throw new ForbiddenException('Write access denied');
    }

    if (updateFormDto.title !== undefined) {
      form.title = updateFormDto.title;
    }
    if (updateFormDto.schema !== undefined) {
      form.schema = updateFormDto.schema;
    }

    return await this.formRepository.save(form);
  }
}
