import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';

@Controller('test-resources')
@ApiTags('test-resources')
export class TestResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('conflicts')
  @ApiOperation({ summary: 'Get resource allocation conflicts (test endpoint)' })
  @ApiResponse({ status: 200, description: 'Resource conflicts retrieved successfully' })
  async getResourceConflictsTest() {
    // Test endpoint that bypasses authentication for testing
    const testOrgId = '06b54693-2b4b-4c10-b553-6dea5c5631c9'; // Use the demo org ID
    return this.resourcesService.checkResourceConflicts(testOrgId);
  }
}


