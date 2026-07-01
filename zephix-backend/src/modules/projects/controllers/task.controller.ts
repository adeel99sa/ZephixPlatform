import {
  Controller,
  Get,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LegacyTasksGuard } from '../../../guards/legacy-tasks.guard';
import { TaskService } from '../services/task.service';

@Controller('projects/:projectId/tasks')
@UseGuards(LegacyTasksGuard, JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @Query('phaseId') phaseId?: string,
  ) {
    if (phaseId) {
      return this.taskService.findByPhase(projectId, phaseId);
    }
    return this.taskService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }
}
