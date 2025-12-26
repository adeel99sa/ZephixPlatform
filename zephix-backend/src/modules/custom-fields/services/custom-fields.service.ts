import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { CustomField } from '../entities/custom-field.entity';
import { CreateCustomFieldDto } from '../dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from '../dto/update-custom-field.dto';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';

@Injectable()
export class CustomFieldsService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(CustomField))
    private readonly repo: TenantAwareRepository<CustomField>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async findAll(organizationId: string): Promise<CustomField[]> {
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId
    return this.repo.find({
      where: {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<CustomField> {
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId
    const field = await this.repo.findOne({
      where: { id },
    });

    if (!field) {
      throw new NotFoundException(`Custom field with ID ${id} not found`);
    }

    return field;
  }

  async create(
    dto: CreateCustomFieldDto,
    organizationId: string,
    userId: string,
  ): Promise<CustomField> {
    // organizationId parameter kept for backward compatibility
    const orgId = this.tenantContextService.assertOrganizationId();

    // Check for duplicate name within organization
    // TenantAwareRepository automatically scopes by organizationId
    const existing = await this.repo.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Custom field with name "${dto.name}" already exists in this organization`,
      );
    }

    const field = this.repo.create({
      ...dto,
      organizationId: orgId,
      createdBy: userId,
      isRequired: dto.isRequired ?? false,
      scope: dto.scope ?? 'all',
      isActive: dto.isActive ?? true,
    });

    return this.repo.save(field);
  }

  async update(
    id: string,
    dto: UpdateCustomFieldDto,
    organizationId: string,
  ): Promise<CustomField> {
    const field = await this.findOne(id, organizationId);

    // If name is being updated, check for duplicates
    // TenantAwareRepository automatically scopes by organizationId
    if (dto.name && dto.name !== field.name) {
      const existing = await this.repo.findOne({
        where: { name: dto.name },
      });

      if (existing) {
        throw new ConflictException(
          `Custom field with name "${dto.name}" already exists in this organization`,
        );
      }
    }

    Object.assign(field, dto);
    return this.repo.save(field);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const field = await this.findOne(id, organizationId);
    await this.repo.remove(field);
  }
}
