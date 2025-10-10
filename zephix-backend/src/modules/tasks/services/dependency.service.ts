import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TaskDependency } from '../entities/task-dependency.entity';
import { Task } from '../entities/task.entity';

@Injectable()
export class DependencyService {
  constructor(
    @InjectRepository(TaskDependency)
    public dependencyRepo: Repository<TaskDependency>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
  ) {}

  async createDependency(
    predecessorId: string, 
    successorId: string, 
    type: string = 'finish_to_start',
    lagDays: number = 0,
    organizationId: string
  ) {
    // Verify both tasks belong to the organization
    const predecessor = await this.taskRepo.findOne({
      where: { id: predecessorId, organizationId }
    });
    
    const successor = await this.taskRepo.findOne({
      where: { id: successorId, organizationId }
    });

    if (!predecessor || !successor) {
      throw new BadRequestException('One or both tasks not found in this organization');
    }

    // Check for circular dependencies
    if (await this.wouldCreateCircularDependency(predecessorId, successorId, organizationId)) {
      throw new BadRequestException('This would create a circular dependency');
    }

    // Check if dependency already exists
    const existing = await this.dependencyRepo.findOne({
      where: { 
        taskId: successorId, 
        dependsOnTaskId: predecessorId 
      }
    });

    if (existing) {
      throw new BadRequestException('Dependency already exists');
    }

    const dependency = this.dependencyRepo.create({
      taskId: successorId,
      dependsOnTaskId: predecessorId,
      dependencyType: type,
      description: `Task ${successorId} depends on ${predecessorId}`,
      relationshipType: 'blocks',
      leadLagDays: lagDays,
      status: 'pending',
      organizationId
    });

    await this.dependencyRepo.save(dependency);
    
    // Recalculate dates for all affected tasks
    await this.recalculateDates(successorId, organizationId);
    
    return dependency;
  }

  async removeDependency(dependencyId: string, organizationId: string) {
    const dependency = await this.dependencyRepo.findOne({
      where: { id: dependencyId, organizationId }
    });

    if (!dependency) {
      throw new BadRequestException('Dependency not found');
    }

    await this.dependencyRepo.remove(dependency);
    
    // Recalculate dates for affected task
    await this.recalculateDates(dependency.taskId, organizationId);
    
    return { success: true };
  }

  async recalculateDates(taskId: string, organizationId: string) {
    try {
      const task = await this.taskRepo.findOne({ where: { id: taskId, organizationId } });
      if (!task) return;

      const dependencies = await this.dependencyRepo.find({ 
        where: { taskId: taskId, organizationId },
        relations: ['dependsOnTask']
      });

      if (dependencies.length > 0) {
        // Calculate new start date based on predecessor end dates
        let latestDate = new Date(0);
        let hasValidPredecessor = false;
        
        for (const dep of dependencies) {
          const predecessor = await this.taskRepo.findOne({ 
            where: { id: dep.dependsOnTaskId, organizationId }
          });
          
          if (predecessor?.plannedEnd || predecessor?.endDate) {
            const endDate = new Date(predecessor.plannedEnd || predecessor.endDate);
            endDate.setDate(endDate.getDate() + dep.leadLagDays + 1);
            
            if (endDate > latestDate) {
              latestDate = endDate;
              hasValidPredecessor = true;
            }
          }
        }

        // Only update if we have a valid predecessor with dates
        if (hasValidPredecessor) {
          // Update task dates
          task.plannedStart = latestDate;
          task.plannedEnd = new Date(latestDate);
          task.plannedEnd.setDate(latestDate.getDate() + (task.durationDays || 1));
          
          // Update the original start/end date fields for compatibility
          task.startDate = task.plannedStart;
          task.endDate = task.plannedEnd;
          
          await this.taskRepo.save(task);
        }
        
        // Cascade to successors
        const successors = await this.dependencyRepo.find({
          where: { dependsOnTaskId: taskId, organizationId }
        });
        
        for (const successor of successors) {
          await this.recalculateDates(successor.taskId, organizationId);
        }
      }
    } catch (error) {
      console.error('Error in recalculateDates:', error);
      // Don't throw - just log and continue
    }
  }

  async calculateCriticalPath(projectId: string, organizationId: string): Promise<string[]> {
    const tasks = await this.taskRepo.find({ 
      where: { projectId, organizationId },
      order: { plannedStart: 'ASC' }
    });
    
    const dependencies = await this.dependencyRepo.find({
      where: { 
        taskId: In(tasks.map(t => t.id)),
        dependsOnTaskId: In(tasks.map(t => t.id)),
        organizationId
      }
    });

    // Create adjacency list
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize
    tasks.forEach(task => {
      graph.set(task.id, []);
      inDegree.set(task.id, 0);
    });

    // Build graph
    dependencies.forEach(dep => {
      const successors = graph.get(dep.dependsOnTaskId) || [];
      successors.push(dep.taskId);
      graph.set(dep.dependsOnTaskId, successors);
      inDegree.set(dep.taskId, (inDegree.get(dep.taskId) || 0) + 1);
    });

    // Forward pass - calculate early start/finish
    const earlyStart = new Map<string, Date>();
    const earlyFinish = new Map<string, Date>();
    const queue: string[] = [];

    // Find tasks with no dependencies
    tasks.forEach(task => {
      if (inDegree.get(task.id) === 0) {
        queue.push(task.id);
        earlyStart.set(task.id, task.plannedStart || new Date());
        earlyFinish.set(task.id, new Date(task.plannedStart || new Date()));
        earlyFinish.get(task.id)!.setDate(earlyFinish.get(task.id)!.getDate() + (task.durationDays || 1));
      }
    });

    // Process queue
    while (queue.length > 0) {
      const current = queue.shift()!;
      const successors = graph.get(current) || [];
      
      successors.forEach(successor => {
        const currentEarlyFinish = earlyFinish.get(current)!;
        const successorEarlyStart = earlyStart.get(successor);
        
        if (!successorEarlyStart || currentEarlyFinish > successorEarlyStart) {
          earlyStart.set(successor, new Date(currentEarlyFinish));
          earlyFinish.set(successor, new Date(currentEarlyFinish));
          const successorTask = tasks.find(t => t.id === successor);
          if (successorTask) {
            earlyFinish.get(successor)!.setDate(
              earlyFinish.get(successor)!.getDate() + (successorTask.durationDays || 1)
            );
          }
        }
        
        inDegree.set(successor, inDegree.get(successor)! - 1);
        if (inDegree.get(successor) === 0) {
          queue.push(successor);
        }
      });
    }

    // Find project end date
    const projectEndDate = Math.max(...Array.from(earlyFinish.values()).map(d => d.getTime()));
    
    // Backward pass - calculate late start/finish
    const lateFinish = new Map<string, Date>();
    const lateStart = new Map<string, Date>();
    
    // Initialize late finish for tasks with no successors
    tasks.forEach(task => {
      const successors = graph.get(task.id) || [];
      if (successors.length === 0) {
        lateFinish.set(task.id, new Date(projectEndDate));
        lateStart.set(task.id, new Date(projectEndDate));
        lateStart.get(task.id)!.setDate(
          lateStart.get(task.id)!.getDate() - (task.durationDays || 1)
        );
      }
    });

    // Process in reverse topological order
    const reverseQueue = [...tasks].reverse();
    reverseQueue.forEach(task => {
      const predecessors = dependencies
        .filter(dep => dep.taskId === task.id)
        .map(dep => dep.dependsOnTaskId);
      
      if (predecessors.length > 0) {
        const minLateStart = Math.min(
          ...predecessors.map(pred => lateStart.get(pred)?.getTime() || Infinity)
        );
        
        if (minLateStart !== Infinity) {
          lateFinish.set(task.id, new Date(minLateStart));
          lateStart.set(task.id, new Date(minLateStart));
          lateStart.get(task.id)!.setDate(
            lateStart.get(task.id)!.getDate() - (task.durationDays || 1)
          );
        }
      }
    });

    // Find critical path (tasks with zero slack)
    const criticalPath: string[] = [];
    tasks.forEach(task => {
      const earlyStartTime = earlyStart.get(task.id)?.getTime() || 0;
      const lateStartTime = lateStart.get(task.id)?.getTime() || 0;
      const slack = lateStartTime - earlyStartTime;
      
      if (slack === 0) {
        criticalPath.push(task.id);
      }
    });

    return criticalPath;
  }

  async updateCriticalPathFlags(projectId: string, organizationId: string) {
    try {
      // Simplified critical path calculation for now
      const tasks = await this.taskRepo.find({ 
        where: { projectId, organizationId },
        order: { plannedStart: 'ASC' }
      });

      // Reset all critical path flags
      await this.taskRepo.update(
        { projectId, organizationId },
        { isCriticalPath: false }
      );

      // Simple critical path: tasks with valid dates are critical for now
      const criticalTasks = tasks.filter(task => {
        if (!task.plannedStart || !task.plannedEnd) return false;
        
        // Convert to Date if it's a string
        const startDate = task.plannedStart instanceof Date ? task.plannedStart : new Date(task.plannedStart);
        const invalidDate = new Date('1969-12-31');
        
        return startDate.getTime() !== invalidDate.getTime();
      });

      if (criticalTasks.length > 0) {
        await this.taskRepo.update(
          { id: In(criticalTasks.map(t => t.id)), organizationId },
          { isCriticalPath: true }
        );
      }

      return criticalTasks.map(t => t.id);
    } catch (error) {
      console.error('Error updating critical path flags:', error);
      return [];
    }
  }

  private async wouldCreateCircularDependency(pred: string, succ: string, organizationId: string): Promise<boolean> {
    // BFS to check if adding this creates a cycle
    const visited = new Set<string>();
    const queue = [succ];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === pred) return true;
      
      if (!visited.has(current)) {
        visited.add(current);
        const deps = await this.dependencyRepo.find({
          where: { dependsOnTaskId: current, organizationId }
        });
        queue.push(...deps.map(d => d.taskId).filter(Boolean));
      }
    }
    
    return false;
  }

  async getTaskDependencies(taskId: string, organizationId: string) {
    return this.dependencyRepo.find({
      where: { taskId: taskId, organizationId },
      relations: ['dependsOnTask']
    });
  }

  async getTaskSuccessors(taskId: string, organizationId: string) {
    return this.dependencyRepo.find({
      where: { dependsOnTaskId: taskId, organizationId },
      relations: ['task']
    });
  }
}
