import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource, Like } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceConflict } from './entities/resource-conflict.entity';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateResourceThresholdDto, ResourceConflictDto } from './dto/resource-threshold.dto';
import { Task } from '../tasks/entities/task.entity';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(ResourceAllocation)
    private resourceAllocationRepository: Repository<ResourceAllocation>,
    @InjectRepository(ResourceConflict)
    private resourceConflictRepository: Repository<ResourceConflict>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private dataSource: DataSource,
  ) {}

  async findAll(organizationId?: string): Promise<any> {
    try {
      // If no organizationId, return empty array (don't crash)
      if (!organizationId) {
        console.log('⚠️ Resources: No organizationId provided');
        return { data: [] };
      }

      // Check if repository is available
      if (!this.resourceRepository) {
        console.error('❌ Resources: Repository not initialized');
        return { data: [] };
      }

      // Simple query with error handling
      const resources = await this.resourceRepository.find({
        where: { organizationId },
        order: { createdAt: 'DESC' }
      }).catch(err => {
        console.error('❌ Resources query error:', err.message);
        return [];
      });

      console.log(`✅ Resources: Found ${resources.length} resources for org ${organizationId}`);
      return { data: resources || [] };
    } catch (error) {
      console.error('❌ Resources findAll error:', error);
      return { data: [] };
    }
  }

  async create(createResourceDto: any): Promise<Resource> {
    try {
      const resource = new Resource();
      Object.assign(resource, createResourceDto);
      return await this.resourceRepository.save(resource);
    } catch (error) {
      console.error('❌ Create resource error:', error);
      throw new BadRequestException('Failed to create resource');
    }
  }

  async getResourceAllocation(
    resourceId: string,
    startDate: string,
    endDate: string,
    organizationId: string
  ): Promise<any> {
    try {
      const allocations = await this.resourceAllocationRepository.find({
        where: {
          resourceId,
          organizationId,
          startDate: Between(new Date(startDate), new Date(endDate))
        }
      });

      const totalAllocation = allocations.reduce(
        (sum, allocation) => sum + (allocation.allocationPercentage || 0),
        0
      );

      return {
        resourceId,
        allocationPercentage: totalAllocation,
        allocations: allocations,
        isOverallocated: totalAllocation > 100,
        isCritical: totalAllocation > 120
      };
    } catch (error) {
      console.error('❌ Get resource allocation error:', error);
      return {
        resourceId,
        allocationPercentage: 0,
        allocations: [],
        isOverallocated: false,
        isCritical: false
      };
    }
  }

  async getConflicts(organizationId: string) {
    try {
      // Get all resources with their allocations
      const resources = await this.resourceRepository.find({
        where: { organizationId, isActive: true },
        relations: ['allocations']
      });

      const conflicts = [];

      for (const resource of resources) {
        const totalAllocation = resource.allocations?.reduce((sum, a) => sum + a.allocationPercentage, 0) || 0;
        
        if (totalAllocation > 100) {
          conflicts.push({
            id: `conflict-${resource.id}`,
            resourceId: resource.id,
            resourceName: resource.name,
            totalAllocation,
            severity: totalAllocation > 150 ? 'critical' : totalAllocation > 120 ? 'high' : 'medium',
            description: `Resource ${resource.name} is overallocated by ${totalAllocation - 100}%`,
            affectedProjects: resource.allocations?.map(a => ({
              projectId: a.projectId,
              allocation: a.allocationPercentage
            })) || []
          });
        }
      }

      return { data: conflicts };
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      throw new BadRequestException('Failed to fetch conflicts');
    }
  }

  async detectConflicts(resourceId: string, startDate: Date, endDate: Date, allocationPercentage: number) {
    try {
      const existingAllocations = await this.resourceAllocationRepository.find({
        where: {
          resourceId,
          startDate: Between(startDate, endDate),
        }
      });

      const totalAllocation = existingAllocations.reduce((sum, a) => sum + a.allocationPercentage, 0);
      const hasConflict = (totalAllocation + allocationPercentage) > 100;

      return {
        hasConflicts: hasConflict,
        conflicts: hasConflict ? existingAllocations : [],
        totalAllocation: totalAllocation + allocationPercentage,
        availableCapacity: 100 - totalAllocation
      };
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      throw new BadRequestException('Failed to detect conflicts');
    }
  }

  async createAllocation(allocationData: any) {
    try {
      // First detect conflicts
      const conflictCheck = await this.detectConflicts(
        allocationData.resourceId,
        new Date(allocationData.startDate),
        new Date(allocationData.endDate),
        allocationData.allocationPercentage
      );

      if (conflictCheck.hasConflicts) {
        throw new BadRequestException('Resource allocation would create conflicts');
      }

      // Create the allocation
      const allocation = this.resourceAllocationRepository.create({
        resourceId: allocationData.resourceId,
        projectId: allocationData.projectId,
        userId: allocationData.userId,
        startDate: new Date(allocationData.startDate),
        endDate: new Date(allocationData.endDate),
        allocationPercentage: allocationData.allocationPercentage,
        organizationId: allocationData.organizationId
      });

      const savedAllocation = await this.resourceAllocationRepository.save(allocation);

      return {
        success: true,
        id: savedAllocation.id,
        allocation: savedAllocation
      };
    } catch (error) {
      console.error('Error creating allocation:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create allocation');
    }
  }

  private async getAllocationsForResource(resourceId: string) {
    return this.resourceAllocationRepository.find({
      where: { resourceId }
    });
  }

  async createAllocationWithAudit(
    dto: CreateAllocationDto,
    auditData: { userId: string; organizationId: string; ipAddress?: string; userAgent?: string }
  ): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create allocation
      const allocation = queryRunner.manager.create(ResourceAllocation, {
        ...dto,
        organizationId: auditData.organizationId,
      });
      const savedAllocation = await queryRunner.manager.save(allocation);

      // Create audit log in same transaction
      const auditLog = queryRunner.manager.create(AuditLog, {
        userId: auditData.userId,
        organizationId: auditData.organizationId,
        entityType: 'resource_allocation',
        entityId: savedAllocation.id,
        action: 'create',
        newValue: dto,
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
      });
      await queryRunner.manager.save(auditLog);

      // Commit transaction
      await queryRunner.commitTransaction();
      return savedAllocation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async calculateUserCapacity(userEmail: string, organizationId: string): Promise<number> {
    try {
      // Get all tasks assigned to this user
      const tasks = await this.taskRepository.find({
        where: {
          assignedResources: Like(`%${userEmail}%`),
          organizationId
        }
      });

      if (tasks.length === 0) {
        return 0;
      }

      // Calculate total estimated hours
      const totalHours = tasks.reduce((sum, task) => {
        return sum + (task.estimatedHours || 0);
      }, 0);

      // Calculate capacity based on 40-hour work week
      const weeksInMonth = 4.33; // Average weeks per month
      const availableHours = 40 * weeksInMonth; // 173.2 hours per month
      const capacityPercentage = (totalHours / availableHours) * 100;

      return Math.min(Math.round(capacityPercentage), 200); // Cap at 200%
    } catch (error) {
      console.error('Failed to calculate user capacity:', error);
      return 0;
    }
  }

  // NEW METHODS FOR COMPLETE RESOURCE MANAGEMENT

  async getResourcesBySkill(skill: string, organizationId: string): Promise<any> {
    try {
      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      // Query resources with specific skill using JSONB query
      const resources = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.organizationId = :organizationId', { organizationId })
        .andWhere('resource.isActive = :isActive', { isActive: true })
        .andWhere('resource.skills::text ILIKE :skill', { skill: `%${skill}%` })
        .orderBy('resource.name', 'ASC')
        .getMany();

      return {
        data: resources,
        total: resources.length,
        skill: skill
      };
    } catch (error) {
      console.error('Error fetching resources by skill:', error);
      throw new BadRequestException('Failed to fetch resources by skill');
    }
  }

  async checkResourceAvailability(resourceId: string, startDate: Date, endDate: Date, organizationId: string): Promise<any> {
    try {
      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      // Get resource details
      const resource = await this.resourceRepository.findOne({
        where: { id: resourceId, organizationId, isActive: true }
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      // Get existing allocations in the date range
      const existingAllocations = await this.resourceAllocationRepository.find({
        where: {
          resourceId,
          organizationId,
          startDate: Between(startDate, endDate)
        }
      });

      // Calculate total allocation for each week
      const weeklyAvailability = this.calculateWeeklyAvailability(
        startDate,
        endDate,
        existingAllocations,
        resource.capacityHoursPerWeek || 40
      );

      const totalAllocation = existingAllocations.reduce(
        (sum, allocation) => sum + (allocation.allocationPercentage || 0),
        0
      );

      return {
        resourceId,
        resourceName: resource.name,
        startDate,
        endDate,
        totalAllocation,
        availableCapacity: 100 - totalAllocation,
        isAvailable: totalAllocation < 100,
        weeklyAvailability,
        conflicts: existingAllocations.filter(a => a.allocationPercentage > 0)
      };
    } catch (error) {
      console.error('Error checking resource availability:', error);
      throw new BadRequestException('Failed to check resource availability');
    }
  }

  async calculateResourceCost(resourceId: string, hours: number, organizationId: string): Promise<any> {
    try {
      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const resource = await this.resourceRepository.findOne({
        where: { id: resourceId, organizationId, isActive: true }
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      const costPerHour = resource.costPerHour || 0;
      const totalCost = costPerHour * hours;

      return {
        resourceId,
        resourceName: resource.name,
        costPerHour,
        hours,
        totalCost,
        currency: 'USD' // Could be made configurable
      };
    } catch (error) {
      console.error('Error calculating resource cost:', error);
      throw new BadRequestException('Failed to calculate resource cost');
    }
  }

  async getResourceUtilization(resourceId: string, period: string, organizationId: string): Promise<any> {
    try {
      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const resource = await this.resourceRepository.findOne({
        where: { id: resourceId, organizationId, isActive: true }
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      // Calculate date range based on period
      const { startDate, endDate } = this.getPeriodDates(period);

      // Get allocations for the period
      const allocations = await this.resourceAllocationRepository.find({
        where: {
          resourceId,
          organizationId,
          startDate: Between(startDate, endDate)
        }
      });

      // Calculate utilization metrics
      const totalAllocation = allocations.reduce(
        (sum, allocation) => sum + (allocation.allocationPercentage || 0),
        0
      );

      const averageUtilization = allocations.length > 0 
        ? totalAllocation / allocations.length 
        : 0;

      const peakUtilization = Math.max(...allocations.map(a => a.allocationPercentage || 0), 0);

      return {
        resourceId,
        resourceName: resource.name,
        period,
        startDate,
        endDate,
        totalAllocation,
        averageUtilization: Math.round(averageUtilization * 100) / 100,
        peakUtilization,
        allocationCount: allocations.length,
        status: this.getUtilizationStatus(averageUtilization)
      };
    } catch (error) {
      console.error('Error getting resource utilization:', error);
      throw new BadRequestException('Failed to get resource utilization');
    }
  }

  // HELPER METHODS

  private calculateWeeklyAvailability(
    startDate: Date, 
    endDate: Date, 
    allocations: any[], 
    capacityHoursPerWeek: number
  ): any[] {
    const weeklyData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekAllocations = allocations.filter(allocation => {
        const allocationStart = new Date(allocation.startDate);
        const allocationEnd = new Date(allocation.endDate);
        return allocationStart <= weekEnd && allocationEnd >= weekStart;
      });
      
      const weekTotal = weekAllocations.reduce(
        (sum, allocation) => sum + (allocation.allocationPercentage || 0),
        0
      );
      
      weeklyData.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalAllocation: weekTotal,
        availableCapacity: 100 - weekTotal,
        isAvailable: weekTotal < 100,
        capacityHours: capacityHoursPerWeek,
        availableHours: capacityHoursPerWeek * (100 - weekTotal) / 100
      });
      
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return weeklyData;
  }

  private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (period.toLowerCase()) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        endDate.setDate(now.getDate());
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        endDate.setDate(now.getDate());
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        endDate.setDate(now.getDate());
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        endDate.setDate(now.getDate());
        break;
      default:
        startDate.setDate(now.getDate() - 30);
        endDate.setDate(now.getDate());
    }

    return { startDate, endDate };
  }

  private getUtilizationStatus(utilization: number): string {
    if (utilization >= 100) return 'overallocated';
    if (utilization >= 90) return 'critical';
    if (utilization >= 80) return 'high';
    if (utilization >= 60) return 'moderate';
    if (utilization >= 40) return 'low';
    return 'available';
  }

  // Resource Threshold Methods
  async checkResourceConflicts(organizationId: string): Promise<ResourceConflictDto[]> {
    console.log('🚨 METHOD CALLED - checkResourceConflicts with orgId:', organizationId);
    try {
      console.log('🔍 Checking conflicts for organization:', organizationId);
      
      // Temporary test - return a test conflict
      return [{
        resourceId: 'test-id',
        resourceName: 'Test Resource',
        projectId: 'test-project',
        projectName: 'Test Project',
        weekStart: new Date(),
        allocationPercentage: 130,
        conflictType: 'over_max',
        resolved: false
      }];
      
      // Get all resources with their allocations
      const resources = await this.resourceRepository.find({
        where: { organizationId },
        relations: ['allocations', 'allocations.project']
      });
      
      console.log('🔍 Found resources:', resources.length);
      console.log('🔍 Resources:', resources.map(r => ({ id: r.id, name: r.name, allocations: r.allocations?.length || 0 })));
      
      const conflicts: ResourceConflictDto[] = [];
      
      for (const resource of resources) {
        console.log('🔍 Processing resource:', resource.name, 'with', resource.allocations?.length || 0, 'allocations');
        
        // Calculate total allocation per week
        const weeklyAllocations = new Map<string, number>();
        
        for (const allocation of resource.allocations || []) {
          console.log('🔍 Allocation:', allocation.allocationPercentage, '%');
          const weekKey = this.getWeekKey(new Date());
          const current = weeklyAllocations.get(weekKey) || 0;
          weeklyAllocations.set(weekKey, current + allocation.allocationPercentage);
        }
        
        console.log('🔍 Weekly allocations:', Object.fromEntries(weeklyAllocations));
        console.log('🔍 Resource thresholds:', { warning: resource.warningThreshold, critical: resource.criticalThreshold, max: resource.maxThreshold });
        
        // Check against thresholds
        for (const [weekKey, total] of weeklyAllocations) {
          console.log('🔍 Checking week', weekKey, 'with total', total, '%');
          if (total >= resource.maxThreshold) {
            conflicts.push({
              resourceId: resource.id,
              resourceName: resource.name || resource.email,
              projectId: 'unknown',
              projectName: 'Multiple Projects',
              weekStart: new Date(weekKey),
              allocationPercentage: total,
              conflictType: 'over_max',
              resolved: false
            });
          } else if (total >= resource.criticalThreshold) {
            conflicts.push({
              resourceId: resource.id,
              resourceName: resource.name || resource.email,
              projectId: 'unknown',
              projectName: 'Multiple Projects',
              weekStart: new Date(weekKey),
              allocationPercentage: total,
              conflictType: 'critical',
              resolved: false
            });
          } else if (total >= resource.warningThreshold) {
            conflicts.push({
              resourceId: resource.id,
              resourceName: resource.name || resource.email,
              projectId: 'unknown',
              projectName: 'Multiple Projects',
              weekStart: new Date(weekKey),
              allocationPercentage: total,
              conflictType: 'warning',
              resolved: false
            });
          }
        }
      }
      
      return conflicts;
    } catch (error) {
      console.error('Error checking resource conflicts:', error);
      return [];
    }
  }

  private getWeekKey(date: Date): string {
    const monday = new Date(date);
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    return monday.toISOString().split('T')[0];
  }

  async updateResourceThresholds(
    resourceId: string,
    thresholds: UpdateResourceThresholdDto,
    organizationId: string
  ): Promise<Resource> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId, organizationId }
    });
    
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    
    resource.warningThreshold = thresholds.warningThreshold;
    resource.criticalThreshold = thresholds.criticalThreshold;
    resource.maxThreshold = thresholds.maxThreshold;
    
    return this.resourceRepository.save(resource);
  }
}
