import {
  Controller,
  Post,
  UseGuards,
  Req,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminOnlyGuard } from '../../../shared/guards/admin-only.guard';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenant-aware.repository';
import { Resource } from '../entities/resource.entity';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';

@Controller('resources')
@ApiTags('resources')
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
@ApiBearerAuth()
export class ResourceSeedController {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Resource))
    private readonly resourceRepo: TenantAwareRepository<Resource>,
  ) {}

  @Post('seed')
  @ApiOperation({ summary: 'Seed sample resources for testing' })
  @ApiResponse({ status: 201, description: 'Resources seeded successfully' })
  async seedResources(@Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Missing organization');
    }

    // If user already has organization, create resources for it
    const sampleResources = [
      {
        name: 'John Smith',
        email: 'john@example.com',
        role: 'Senior Developer',
        skills: ['TypeScript', 'React', 'Node.js'],
        capacityHoursPerWeek: 40,
        costPerHour: 150,
        organizationId,
        isActive: true,
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        role: 'Project Manager',
        skills: ['Agile', 'Scrum', 'Risk Management'],
        capacityHoursPerWeek: 40,
        costPerHour: 120,
        organizationId,
        isActive: true,
      },
    ];

    const createdResources = [];
    for (const resourceData of sampleResources) {
      const resource = this.resourceRepo.create(resourceData);
      const savedResource = await this.resourceRepo.save(resource);
      createdResources.push(savedResource);
    }

    return {
      success: true,
      message: 'Resources seeded successfully',
      organizationId,
      resources: createdResources,
    };
  }
}
