import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ResourceAllocationService } from './resource-allocation.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('allocations')
@UseGuards(AuthGuard('jwt'))
export class ResourceAllocationController {
  constructor(private readonly allocationService: ResourceAllocationService) {}

  @Post()
  async createAllocation(
    @Body() body: {
      userId: string;
      projectId: string;
      startDate: string;
      endDate: string;
      allocationPercentage: number;
    },
    @Req() req: any
  ) {
    const organizationId = req.user.organizationId || 'default';
    
    return this.allocationService.createAllocation(
      organizationId,
      body.userId,
      body.projectId,
      new Date(body.startDate),
      new Date(body.endDate),
      body.allocationPercentage
    );
  }

  @Get('availability')
  async checkAvailability(
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any
  ) {
    const organizationId = req.user.organizationId || 'default';
    
    // This would call a method to check availability
    // For now, return a placeholder
    return {
      userId,
      available: true,
      currentAllocation: 0
    };
  }
}
