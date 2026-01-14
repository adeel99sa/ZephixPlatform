import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalUserMapping } from '../entities/external-user-mapping.entity';
import { CreateExternalUserMappingDto } from '../dto/create-external-user-mapping.dto';

@Injectable()
export class ExternalUserMappingService {
  private readonly logger = new Logger(ExternalUserMappingService.name);

  constructor(
    @InjectRepository(ExternalUserMapping)
    private mappingRepository: Repository<ExternalUserMapping>,
  ) {}

  async createMapping(
    organizationId: string,
    dto: CreateExternalUserMappingDto,
  ): Promise<ExternalUserMapping> {
    // Reject non-jira systems for Phase 2 vertical slice
    if (dto.externalSystem !== 'jira') {
      throw new BadRequestException(
        `Only 'jira' external system is supported in Phase 2`,
      );
    }

    // Check for existing mapping
    const existing = await this.mappingRepository.findOne({
      where: {
        organizationId,
        externalSystem: dto.externalSystem,
        externalEmail: dto.externalEmail,
      },
    });

    if (existing) {
      // Update existing mapping
      existing.resourceId = dto.resourceId;
      if (dto.externalUserId) {
        existing.externalUserId = dto.externalUserId;
      }
      return await this.mappingRepository.save(existing);
    }

    // Create new mapping
    const mapping = this.mappingRepository.create({
      organizationId,
      externalSystem: dto.externalSystem,
      externalEmail: dto.externalEmail,
      externalUserId: dto.externalUserId,
      resourceId: dto.resourceId,
    });

    return await this.mappingRepository.save(mapping);
  }

  async listMappings(organizationId: string): Promise<ExternalUserMapping[]> {
    return await this.mappingRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByEmail(
    organizationId: string,
    externalSystem: 'jira' | 'linear' | 'github',
    externalEmail: string,
  ): Promise<ExternalUserMapping | null> {
    return await this.mappingRepository.findOne({
      where: {
        organizationId,
        externalSystem,
        externalEmail,
      },
    });
  }
}
