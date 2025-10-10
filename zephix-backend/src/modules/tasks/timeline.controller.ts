import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationValidationGuard } from '../../guards/organization-validation.guard';
import { TasksService } from './tasks.service';
import { DependencyService } from './services/dependency.service';
import { ResourcesService } from '../resources/resources.service';
import { KPIService } from '../kpi/kpi.service';

@Controller('timeline')
@UseGuards(JwtAuthGuard, OrganizationValidationGuard)
export class TimelineController {
  constructor(
    private taskService: TasksService,
    private dependencyService: DependencyService,
    private resourceService: ResourcesService,
    private kpiService: KPIService,
  ) {}

  @Get('project/:projectId')
  async getTimelineData(@Param('projectId') projectId: string, @Req() req: any) {
    try {
      const organizationId = req.user.organizationId;
      console.log('Getting timeline data for project:', projectId, 'org:', organizationId);
    
      // Get all tasks for the project
      const tasks = await this.taskService.findAll(projectId, organizationId);
      console.log('Found tasks:', tasks.length);
      
      // Simplified response for now
      return {
        success: true,
        data: {
          tasks: tasks.map(task => ({
            id: task.id,
            name: task.title,
            start: task.plannedStart || task.startDate,
            end: task.plannedEnd || task.endDate,
            duration: task.durationDays || 1,
            progress: task.completionPercentage || task.progress || 0,
            dependencies: [],
            resourceId: task.assignedResources,
            isCritical: false,
            isMilestone: task.isMilestone || false,
            status: task.status,
            priority: task.priority,
            estimatedHours: task.estimatedHours,
            actualHours: task.actualHours,
          })),
          resources: [],
          criticalPath: [],
          conflicts: { hasConflicts: false, conflicts: [], totalAllocation: 0, availableCapacity: 0 },
          projectId,
        }
      };
    } catch (error) {
      console.error('Timeline error:', error);
      throw error;
    }
  }

  @Post('task/:taskId/move')
  async moveTask(
    @Param('taskId') taskId: string,
    @Body() dto: { newStartDate: string; newEndDate?: string },
    @Req() req: any
  ) {
    try {
      const organizationId = req.user.organizationId;
      console.log('Moving task:', taskId, 'to:', dto.newStartDate);
      
      // Get the task to verify ownership
      const task = await this.taskService.findTaskById(taskId, organizationId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Update task dates
      const newStart = new Date(dto.newStartDate);
      const newEnd = dto.newEndDate ? new Date(dto.newEndDate) : new Date(newStart);
      
      if (!dto.newEndDate) {
        newEnd.setDate(newStart.getDate() + (task.durationDays || 1));
      }

      // Update task
      await this.taskService.update(taskId, {
        plannedStart: newStart,
        plannedEnd: newEnd,
        startDate: newStart, // For compatibility
        endDate: newEnd,     // For compatibility
      }, organizationId);
      
      // Cascade to dependencies
      await this.dependencyService.recalculateDates(taskId, organizationId);
      
      // Update critical path (simplified for now)
      try {
        await this.dependencyService.updateCriticalPathFlags(task.projectId, organizationId);
      } catch (error) {
        console.warn('Critical path update failed:', error);
      }
      
      // Trigger KPI recalculation
      try {
        await this.kpiService.invalidateProjectCache(task.projectId);
      } catch (error) {
        console.warn('KPI recalculation failed:', error);
      }
      
      // Check for resource conflicts (simplified for now)
      const conflicts = { hasConflicts: false, conflicts: [], totalAllocation: 0, availableCapacity: 0 };
      
      return { 
        success: true, 
        conflicts,
        message: conflicts.hasConflicts ? 'Task moved but resource conflicts detected' : 'Task moved successfully'
      };
    } catch (error) {
      console.error('Task move error:', error);
      throw error;
    }
  }

  @Post('dependency')
  async createDependency(@Body() dto: {
    predecessorId: string;
    successorId: string;
    type?: string;
    lagDays?: number;
  }, @Req() req: any) {
    try {
      const organizationId = req.user.organizationId;
      console.log('Creating dependency:', dto);
      
      // Verify both tasks belong to the same organization
      const predecessor = await this.taskService.findTaskById(dto.predecessorId, organizationId);
      const successor = await this.taskService.findTaskById(dto.successorId, organizationId);
      
      if (!predecessor || !successor) {
        throw new Error('One or both tasks not found');
      }

      if (predecessor.projectId !== successor.projectId) {
        throw new Error('Tasks must be in the same project');
      }

      const dependency = await this.dependencyService.createDependency(
        dto.predecessorId,
        dto.successorId,
        dto.type || 'finish_to_start',
        dto.lagDays || 0,
        organizationId
      );

      // Update critical path
      await this.dependencyService.updateCriticalPathFlags(successor.projectId, organizationId);

      return {
        success: true,
        data: dependency
      };
    } catch (error) {
      console.error('Dependency creation error:', error);
      throw error;
    }
  }

  @Delete('dependency/:id')
  async removeDependency(@Param('id') id: string, @Req() req: any) {
    try {
      const organizationId = req.user.organizationId;
      console.log('Removing dependency:', id);
      
      // Get dependency to verify ownership
      const dependency = await this.dependencyService.dependencyRepo.findOne({
        where: { id },
        relations: ['task', 'dependsOnTask']
      });

      if (!dependency) {
        throw new Error('Dependency not found');
      }

      // Verify organization access
      const task = await this.taskService.findTaskById(dependency.taskId, organizationId);
      if (!task) {
        throw new Error('Access denied');
      }

      await this.dependencyService.removeDependency(id, organizationId);
      
      // Update critical path
      await this.dependencyService.updateCriticalPathFlags(task.projectId, organizationId);

      return { success: true };
    } catch (error) {
      console.error('Dependency removal error:', error);
      throw error;
    }
  }

  @Get('project/:projectId/critical-path')
  async getCriticalPath(@Param('projectId') projectId: string, @Req() req: any) {
    try {
      const organizationId = req.user.organizationId;
      
      // Verify project access
      const tasks = await this.taskService.findAll(projectId, organizationId);
      if (tasks.length === 0) {
        throw new Error('Project not found or no tasks');
      }

      // Simplified critical path calculation
      const criticalPath = await this.dependencyService.updateCriticalPathFlags(projectId, organizationId);
      
      return {
        success: true,
        data: {
          criticalPath,
          projectId,
          totalTasks: tasks.length,
          criticalTasks: criticalPath.length,
        }
      };
    } catch (error) {
      console.error('Critical path error:', error);
      throw error;
    }
  }

  @Post('project/:projectId/recalculate')
  async recalculateProject(@Param('projectId') projectId: string, @Req() req: any) {
    const organizationId = req.user.organizationId;
    
    // Verify project access
    const tasks = await this.taskService.findAll(projectId, organizationId);
    if (tasks.length === 0) {
      throw new Error('Project not found or no tasks');
    }

    // Recalculate all dependencies
    for (const task of tasks) {
      await this.dependencyService.recalculateDates(task.id, organizationId);
    }

    // Update critical path
    const criticalPath = await this.dependencyService.updateCriticalPathFlags(projectId, organizationId);

    // Recalculate KPIs
    try {
      await this.kpiService.calculateProjectKPIs(projectId);
    } catch (error) {
      console.warn('KPI recalculation failed:', error);
    }

    return {
      success: true,
      criticalPath,
      message: 'Project timeline recalculated successfully'
    };
  }
}
