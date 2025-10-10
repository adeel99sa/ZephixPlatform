import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Req() req: any) {
    return this.tasksService.create(createTaskDto, req.user.organizationId);
  }

  @Get('project/:projectId')
  findAll(@Param('projectId') projectId: string, @Req() req: any) {
    return this.tasksService.findAll(projectId, req.user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.findTaskById(id, req.user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @Req() req: any) {
    return this.tasksService.update(id, updateTaskDto, req.user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.delete(id, req.user.organizationId, req.user.id);
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id') id: string, 
    @Body('progress') progress: number, 
    @Req() req: any
  ) {
    return this.tasksService.updateProgress(id, progress, req.user.organizationId);
  }

  @Get('my-tasks')
  getMyTasks(@Req() req: any) {
    const userEmail = req.user?.email;
    return this.tasksService.findByAssignee(userEmail, req.user.organizationId);
  }

  @Post(':id/dependencies')
  addDependency(
    @Param('id') taskId: string,
    @Body() dto: { predecessorId: string },
    @Req() req: any
  ) {
    return this.tasksService.addDependency(taskId, dto.predecessorId, req.user.organizationId);
  }

  @Delete(':id/dependencies/:depId')
  removeDependency(
    @Param('id') taskId: string,
    @Param('depId') dependencyId: string,
    @Req() req: any
  ) {
    return this.tasksService.removeDependency(taskId, dependencyId, req.user.organizationId);
  }

  @Get(':id/dependencies')
  getDependencies(@Param('id') taskId: string, @Req() req: any) {
    return this.tasksService.getDependencies(taskId, req.user.organizationId);
  }
}
