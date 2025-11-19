import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomField } from '../entities/custom-field.entity';
import { CreateCustomFieldDto } from '../dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from '../dto/update-custom-field.dto';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(CustomField)
    private readonly repo: Repository<CustomField>,
  ) {}

  async findAll(organizationId: string): Promise<CustomField[]> {
    return this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<CustomField> {
    const field = await this.repo.findOne({
      where: { id, organizationId },
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
    // Check for duplicate name within organization
    const existing = await this.repo.findOne({
      where: { name: dto.name, organizationId },
    });

    if (existing) {
      throw new ConflictException(
        `Custom field with name "${dto.name}" already exists in this organization`,
      );
    }

    const field = this.repo.create({
      ...dto,
      organizationId,
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
    if (dto.name && dto.name !== field.name) {
      const existing = await this.repo.findOne({
        where: { name: dto.name, organizationId },
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
