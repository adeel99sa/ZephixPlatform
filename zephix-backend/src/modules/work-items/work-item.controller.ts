import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';

import { WorkItemService } from './work-item.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('work-items')
@UseGuards(JwtAuthGuard)
export class WorkItemController {
  constructor(private readonly workItemService: WorkItemService) {}

  @Get()
  async getAllWorkItems() {
    return this.workItemService.getAllWorkItems();
  }

  @Post()
  async createWorkItem(
    @Body() body: {
      projectId: string;
      title: string;
      type: 'task' | 'story' | 'bug' | 'epic';
      phaseOrSprint: string;
    }
  ) {
    if (!body.projectId || !body.title) {
      throw new BadRequestException('Project ID and title are required');
    }
    
    return this.workItemService.createWorkItem(
      body.projectId,
      body.title,
      body.type,
      body.phaseOrSprint
    );
  }

  @Get('project/:projectId')
  async getProjectWorkItems(@Param('projectId') projectId: string) {
    return this.workItemService.getProjectWorkItems(projectId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'todo' | 'in_progress' | 'done' | 'blocked'
  ) {
    if (!status) {
      throw new BadRequestException('Status is required');
    }
    
    return this.workItemService.updateWorkItemStatus(id, status);
  }
}
