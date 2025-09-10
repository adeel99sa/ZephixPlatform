import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from '../entities/resource.entity';

@Controller('resources')
@ApiTags('resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourceSeedController {
  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
  ) {}

  @Post('seed')
  @ApiOperation({ summary: 'Seed sample resources for testing' })
  @ApiResponse({ status: 201, description: 'Resources seeded successfully' })
  async seedResources(@Req() req: any) {
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      // Create a temporary organization for the user
      // This is a quick fix for testing
      const tempOrgId = 'temp-org-' + Date.now();
      
      // Update user with temporary organization
      // Note: This would normally be done through a proper user service
      console.log('Creating temporary organization for user');
      
      // Create sample resources with temporary org
      const sampleResources = [
        {
          name: 'John Smith',
          email: 'john@example.com',
          role: 'Senior Developer',
          skills: ['TypeScript', 'React', 'Node.js'],
          capacityHoursPerWeek: 40,
          costPerHour: 150,
          organizationId: tempOrgId,
          isActive: true
        },
        {
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          role: 'Project Manager',
          skills: ['Agile', 'Scrum', 'Risk Management'],
          capacityHoursPerWeek: 40,
          costPerHour: 120,
          organizationId: tempOrgId,
          isActive: true
        },
        {
          name: 'Mike Chen',
          email: 'mike@example.com',
          role: 'UX Designer',
          skills: ['Figma', 'UI/UX', 'Prototyping'],
          capacityHoursPerWeek: 40,
          costPerHour: 130,
          organizationId: tempOrgId,
          isActive: true
        }
      ];

      const createdResources = [];
      for (const resourceData of sampleResources) {
        const resource = this.resourceRepository.create(resourceData);
        const savedResource = await this.resourceRepository.save(resource);
        createdResources.push(savedResource);
      }

      return {
        success: true,
        message: 'Resources seeded with temporary organization',
        organizationId: tempOrgId,
        resources: createdResources
      };
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
        isActive: true
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        role: 'Project Manager',
        skills: ['Agile', 'Scrum', 'Risk Management'],
        capacityHoursPerWeek: 40,
        costPerHour: 120,
        organizationId,
        isActive: true
      }
    ];

    const createdResources = [];
    for (const resourceData of sampleResources) {
      const resource = this.resourceRepository.create(resourceData);
      const savedResource = await this.resourceRepository.save(resource);
      createdResources.push(savedResource);
    }

    return {
      success: true,
      message: 'Resources seeded successfully',
      organizationId,
      resources: createdResources
    };
  }
}
