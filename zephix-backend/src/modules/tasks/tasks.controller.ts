import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.tasksService.create(createTaskDto, organizationId);
  }

  @Get('project/:projectId')
  findAll(@Param('projectId') projectId: string, @Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.tasksService.findAll(projectId, organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.tasksService.findOne(id, organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);
    return this.tasksService.update(id, updateTaskDto, organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.tasksService.delete(id, organizationId);
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @Body('progress') progress: number,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);
    return this.tasksService.updateProgress(id, progress, organizationId);
  }

  @Get('my-tasks')
  getMyTasks(@Req() req: AuthRequest) {
    const { email, organizationId } = getAuthContext(req);
    return this.tasksService.findByAssignee(email, organizationId);
  }

  @Post(':id/dependencies')
  addDependency(
    @Param('id') taskId: string,
    @Body() dto: { predecessorId: string },
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);
    return this.tasksService.addDependency(
      taskId,
      dto.predecessorId,
      organizationId,
    );
  }

  @Delete(':id/dependencies/:depId')
  removeDependency(
    @Param('id') taskId: string,
    @Param('depId') dependencyId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);
    return this.tasksService.removeDependency(
      taskId,
      dependencyId,
      organizationId,
    );
  }

  @Get(':id/dependencies')
  getDependencies(@Param('id') taskId: string, @Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.tasksService.getDependencies(taskId, organizationId);
  }
}
