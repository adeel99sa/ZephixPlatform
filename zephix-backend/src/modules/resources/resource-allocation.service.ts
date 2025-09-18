import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource, In } from 'typeorm';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { UserDailyCapacity } from './entities/user-daily-capacity.entity';
import { Resource } from './entities/resource.entity';
import { Task } from '../tasks/entities/task.entity';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';

@Injectable()
export class ResourceAllocationService {
  constructor(
    @InjectRepository(ResourceAllocation)
    private allocationRepository: Repository<ResourceAllocation>,
    @InjectRepository(UserDailyCapacity)
    private capacityRepository: Repository<UserDailyCapacity>,
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private dataSource: DataSource,
  ) {}

  // Standard CRUD methods for consistent API
  async create(createAllocationDto: CreateAllocationDto, organizationId: string, userId: string) {
    const allocation = this.allocationRepository.create({
      ...createAllocationDto,
      organizationId,
      userId,
    });

    return this.allocationRepository.save(allocation);
  }

  async findAll(organizationId: string, resourceId?: string, projectId?: string) {
    const where: any = { organizationId };
    
    if (resourceId) where.resourceId = resourceId;
    if (projectId) where.projectId = projectId;

    return this.allocationRepository.find({
      where,
      relations: ['resource', 'task'],
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string, organizationId: string) {
    const allocation = await this.allocationRepository.findOne({
      where: { id, organizationId },
      relations: ['resource', 'task']
    });

    if (!allocation) {
      throw new NotFoundException('Resource allocation not found');
    }

    return allocation;
  }

  async update(id: string, updateAllocationDto: UpdateAllocationDto, organizationId: string) {
    const allocation = await this.findOne(id, organizationId);
    
    Object.assign(allocation, updateAllocationDto);
    return this.allocationRepository.save(allocation);
  }

  async remove(id: string, organizationId: string) {
    const allocation = await this.findOne(id, organizationId);
    await this.allocationRepository.remove(allocation);
    return { message: 'Resource allocation deleted successfully' };
  }

  async findByResource(resourceId: string, organizationId: string) {
    return this.allocationRepository.find({
      where: { resourceId, organizationId },
      relations: ['resource', 'task', 'project'],
      order: { startDate: 'ASC' }
    });
  }

  async findByProject(projectId: string, organizationId: string) {
    return this.allocationRepository.find({
      where: { projectId, organizationId },
      relations: ['resource', 'task', 'project'],
      order: { startDate: 'ASC' }
    });
  }

  async createAllocation(
    organizationId: string,
    userId: string,
    projectId: string,
    startDate: Date,
    endDate: Date,
    allocationPercentage: number
  ) {
    // Validate dates
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (allocationPercentage < 1 || allocationPercentage > 100) {
      throw new BadRequestException('Allocation percentage must be between 1 and 100');
    }

    // Check for conflicts
    const conflicts = await this.checkCapacityConflicts(
      organizationId,
      userId,
      startDate,
      endDate,
      allocationPercentage
    );

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Resource overallocation detected',
        conflicts: conflicts,
        suggestions: await this.generateSuggestions(
          organizationId,
          startDate,
          endDate,
          allocationPercentage
        )
      });
    }

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create allocation
      const allocation = this.allocationRepository.create({
        organizationId,
        userId,
        projectId,
        startDate,
        endDate,
        allocationPercentage
      });

      const savedAllocation = await queryRunner.manager.save(allocation);

      // Update daily capacity with proper accumulation
      await this.updateDailyCapacity(
        queryRunner.manager,
        organizationId,
        userId,
        startDate,
        endDate,
        allocationPercentage
      );

      await queryRunner.commitTransaction();
      return savedAllocation;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async checkCapacityConflicts(
    organizationId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
    allocationPercentage: number
  ): Promise<Array<{ date: Date; currentAllocation: number; wouldBe: number }>> {
    const dailyCapacities = await this.capacityRepository.find({
      where: {
        organizationId,
        userId,
        capacityDate: Between(startDate, endDate)
      }
    });

    const conflicts: Array<{ date: Date; currentAllocation: number; wouldBe: number }> = [];
    for (const capacity of dailyCapacities) {
      const newTotal = capacity.allocatedPercentage + allocationPercentage;
      if (newTotal > 100) {
        conflicts.push({
          date: capacity.capacityDate,
          currentAllocation: capacity.allocatedPercentage,
          wouldBe: newTotal
        });
      }
    }

    return conflicts;
  }

  private async updateDailyCapacity(
    manager: any,
    organizationId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
    allocationPercentage: number
  ) {
    // Fixed date enumeration - create new date objects
    const dates: Date[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      dates.push(new Date(current)); // Create new date object
      current.setDate(current.getDate() + 1);
    }

    // Batch update with proper accumulation
    for (const date of dates) {
      const existing = await manager.findOne(UserDailyCapacity, {
        where: { organizationId, userId, capacityDate: date }
      });

      if (existing) {
        existing.allocatedPercentage += allocationPercentage;
        await manager.save(UserDailyCapacity, existing);
      } else {
        await manager.save(UserDailyCapacity, {
          organizationId,
          userId,
          capacityDate: date,
          allocatedPercentage: allocationPercentage
        });
      }
    }
  }

  private async generateSuggestions(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    requiredPercentage: number
  ) {
    // Find users with capacity
    const availableUsers = await this.capacityRepository
      .createQueryBuilder('capacity')
      .select('capacity.userId')
      .addSelect('AVG(capacity.allocatedPercentage)', 'avgAllocation')
      .where('capacity.organizationId = :organizationId', { organizationId })
      .andWhere('capacity.capacityDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('capacity.userId')
      .having('AVG(capacity.allocatedPercentage) <= :maxAllocation', { 
        maxAllocation: 100 - requiredPercentage 
      })
      .getRawMany();

    return availableUsers.slice(0, 3); // Return top 3 suggestions
  }

  async getTaskBasedHeatMap(organizationId: string) {
    // Get all resources
    const resources = await this.resourceRepository.find({
      where: { organizationId }
    });

    // Get all active tasks
    const tasks = await this.taskRepository.find({
      where: { 
        organizationId,
        status: In(['pending', 'in_progress'])
      }
    });

    // Calculate allocations for next 4 weeks
    const heatMap = [];
    const today = new Date();
    
    for (const resource of resources) {
      const weekData = [];
      
      for (let week = 0; week < 4; week++) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + (week * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        // Count tasks assigned to this resource in this week
        const tasksInWeek = tasks.filter(task => {
          const startDate = task.startDate || task.createdAt;
          const endDate = task.endDate || task.dueDate || startDate;
          
          return task.assignedTo === resource.userId &&
                 new Date(startDate) <= weekEnd &&
                 new Date(endDate) >= weekStart;
        });
        
        // Simple model: each task = 25% allocation
        const allocation = tasksInWeek.length * 25;
        
        weekData.push({
          weekStart: weekStart.toISOString().split('T')[0],
          taskCount: tasksInWeek.length,
          allocation: allocation,
          status: allocation > 100 ? 'critical' : 
                  allocation > 75 ? 'warning' : 'available',
          tasks: tasksInWeek.map(t => ({
            id: t.id,
            name: t.name || 'Task', // The entity maps 'title' column to 'name' property
            projectId: t.projectId
          }))
        });
      }
      
      heatMap.push({
        resourceId: resource.id,
        resourceName: resource.name || 'Unknown',
        weeks: weekData
      });
    }
    
    return heatMap;
  }
}
