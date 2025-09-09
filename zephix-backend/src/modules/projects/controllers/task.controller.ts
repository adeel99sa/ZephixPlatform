import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Query, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TaskService } from '../services/task.service';
import { CreateTaskDto, UpdateTaskDto } from '../dto/create-task.dto';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: any, // Get user from request
  ) {
    console.log('Received DTO keys:', Object.keys(createTaskDto));
    console.log('Dependencies field:', createTaskDto.dependencies);
    
    // Pass user ID to service
    const userId = req.user?.id || null;
    return this.taskService.create(projectId, createTaskDto, userId);
  }

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

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.taskService.update(id, updateTaskDto, 'system');
  }

  @Patch(':taskId')
  updateTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || null;
    return this.taskService.update(taskId, updateTaskDto, userId);
  }

  @Put(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @Body('progress') progress: number,
  ) {
    return this.taskService.updateProgress(id, progress);
  }


  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.taskService.delete(id);
  }
}
