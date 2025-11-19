import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { Resource } from '../entities/resource.entity';

@Injectable()
export class ResourceCalculationService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
  ) {}

  async calculateResourceImpact(taskId: string): Promise<number> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task || !task.assignedResources || !task.estimatedHours) {
      return 0;
    }

    // Parse assigned resources (comma-separated string)
    const resourceNames = task.assignedResources
      .split(',')
      .map((r) => r.trim());
    const resourceCount = resourceNames.length || 1;

    // Calculate hours per resource
    const hoursPerResource = task.estimatedHours / resourceCount;

    // Calculate impact based on standard 40-hour week
    const weeksForTask = this.calculateWeeksBetween(
      task.startDate,
      task.endDate,
    );
    const hoursPerWeek = hoursPerResource / (weeksForTask || 1);
    const impactPercentage = (hoursPerWeek / 40) * 100;

    return Math.round(impactPercentage);
  }

  async calculateTotalResourceLoad(
    resourceName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Find all tasks assigned to this resource in the date range
    const tasks = await this.taskRepository.find({
      where: {
        startDate: Between(startDate, endDate),
      },
    });

    // Filter tasks that include this resource
    const resourceTasks = tasks.filter(
      (task) =>
        task.assignedResources &&
        task.assignedResources
          .toLowerCase()
          .includes(resourceName.toLowerCase()),
    );

    // Calculate total hours
    let totalHours = 0;
    for (const task of resourceTasks) {
      const resourceCount = task.assignedResources.split(',').length;
      totalHours += (task.estimatedHours || 0) / resourceCount;
    }

    // Calculate percentage based on weeks and 40-hour week
    const weeks = this.calculateWeeksBetween(startDate, endDate);
    const availableHours = weeks * 40;
    const loadPercentage = (totalHours / availableHours) * 100;

    return Math.round(loadPercentage);
  }

  private calculateWeeksBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays / 7, 1);
  }
}
