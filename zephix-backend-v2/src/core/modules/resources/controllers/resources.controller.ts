import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ResourcesService } from '../services/resources.service';
import { AllocateResourceDto } from '../dto/allocate-resource.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { CurrentOrg } from '../../organizations/decorators/current-org.decorator';

@Controller({ path: 'resources', version: '1' })
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post('allocate')
  allocate(
    @Body() dto: AllocateResourceDto,
    @CurrentOrg() organizationId: string,
  ) {
    return this.resourcesService.allocateResource(dto, organizationId);
  }

  @Get('heat-map')
  getHeatMap(
    @CurrentOrg() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.resourcesService.getResourceHeatMap(
      organizationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('conflicts')
  async getConflicts(@CurrentOrg() organizationId: string) {
    // This would return unresolved conflicts
    return [];
  }
}
