import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { Project } from '../../projects/entities/project.entity';

export interface ValidationResult {
  isValid: boolean;
  conflicts: ResourceConflict[];
  totalAllocation: number;
  availableCapacity: number;
}

export interface ResourceConflict {
  projectId: string;
  projectName: string;
  startDate: Date;
  endDate: Date;
  allocationPercentage: number;
  conflictType: 'OVERALLOCATION' | 'SCHEDULE_OVERLAP';
}

export interface AllocationRequest {
  resourceId: string;
  projectId: string;
  taskId?: string;
  startDate: Date;
  endDate: Date;
  allocationPercentage: number;
  hoursPerDay?: number;
}

export interface ResourceUtilization {
  resourceId: string;
  totalAllocation: number;
  projects: Array<{
    projectId: string;
    projectName: string;
    allocationPercentage: number;
    startDate: Date;
    endDate: Date;
  }>;
}

@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(ResourceAllocation)
    private readonly resourceAllocationRepository: Repository<ResourceAllocation>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
  ) {}

  async allocateResource(allocationRequest: AllocationRequest): Promise<ResourceAllocation> {
    // Validate allocation request
    const validation = await this.validateAllocation(
      allocationRequest.resourceId,
      allocationRequest.startDate,
      allocationRequest.endDate,
      allocationRequest.allocationPercentage
    );

    if (!validation.isValid) {
      throw new ConflictException(`Resource allocation conflict detected: ${validation.conflicts.length} conflicts found`);
    }

    // Create new allocation
    const allocation = this.resourceAllocationRepository.create({
      ...allocationRequest,
      hoursPerDay: allocationRequest.hoursPerDay || 8,
    });

    return this.resourceAllocationRepository.save(allocation);
  }

  async validateAllocation(
    resourceId: string,
    startDate: Date,
    endDate: Date,
    allocationPercentage: number
  ): Promise<ValidationResult> {
    // Get existing allocations for the resource in the date range
    const existingAllocations = await this.resourceAllocationRepository.find({
      where: {
        resourceId,
        startDate: Between(startDate, endDate),
      },
      relations: ['project'],
    });

    // Calculate total allocation for overlapping periods
    let totalAllocation = 0;
    const conflicts: ResourceConflict[] = [];

    for (const allocation of existingAllocations) {
      const overlapStart = new Date(Math.max(startDate.getTime(), allocation.startDate.getTime()));
      const overlapEnd = new Date(Math.min(endDate.getTime(), allocation.endDate.getTime()));
      
      if (overlapStart < overlapEnd) {
        totalAllocation += allocation.allocationPercentage;
        
        // Check for over-allocation conflict
        if (totalAllocation + allocationPercentage > 100) {
          conflicts.push({
            projectId: allocation.projectId,
            projectName: allocation.project.name,
            startDate: allocation.startDate,
            endDate: allocation.endDate,
            allocationPercentage: allocation.allocationPercentage,
            conflictType: 'OVERALLOCATION',
          });
        }
      }
    }

    const isValid = totalAllocation + allocationPercentage <= 100;
    const availableCapacity = Math.max(0, 100 - totalAllocation);

    return {
      isValid,
      conflicts,
      totalAllocation,
      availableCapacity,
    };
  }

  async checkAllocationConflicts(resourceId: string, startDate: Date, endDate: Date): Promise<ResourceConflict[]> {
    const validation = await this.validateAllocation(resourceId, startDate, endDate, 0);
    return validation.conflicts;
  }

  async getResourceUtilization(resourceId: string, startDate?: Date, endDate?: Date): Promise<ResourceUtilization> {
    const query = this.resourceAllocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.project', 'project')
      .where('allocation.resourceId = :resourceId', { resourceId });

    if (startDate && endDate) {
      query.andWhere(
        '(allocation.startDate <= :endDate AND allocation.endDate >= :startDate)',
        { startDate, endDate }
      );
    }

    const allocations = await query.getMany();

    const totalAllocation = allocations.reduce((sum, alloc) => sum + alloc.allocationPercentage, 0);
    const projects = allocations.map(alloc => ({
      projectId: alloc.projectId,
      projectName: alloc.project.name,
      allocationPercentage: alloc.allocationPercentage,
      startDate: alloc.startDate,
      endDate: alloc.endDate,
    }));

    return {
      resourceId,
      totalAllocation,
      projects,
    };
  }

  async getAvailableCapacity(organizationId: string, startDate: Date, endDate: Date): Promise<Array<{ resourceId: string; availableCapacity: number }>> {
    // Get all resource allocations in the date range for the organization
    const allocations = await this.resourceAllocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.project', 'project')
      .where('project.organizationId = :organizationId', { organizationId })
      .andWhere(
        '(allocation.startDate <= :endDate AND allocation.endDate >= :startDate)',
        { startDate, endDate }
      )
      .getMany();

    // Group by resource and calculate availability
    const resourceAvailability = new Map<string, number>();
    
    for (const allocation of allocations) {
      const current = resourceAvailability.get(allocation.resourceId) || 0;
      resourceAvailability.set(allocation.resourceId, current + allocation.allocationPercentage);
    }

    return Array.from(resourceAvailability.entries()).map(([resourceId, totalAllocation]) => ({
      resourceId,
      availableCapacity: Math.max(0, 100 - totalAllocation),
    }));
  }

  async updateAllocation(
    allocationId: string,
    updates: Partial<AllocationRequest>
  ): Promise<ResourceAllocation> {
    const allocation = await this.resourceAllocationRepository.findOne({
      where: { id: allocationId },
    });

    if (!allocation) {
      throw new NotFoundException('Resource allocation not found');
    }

    // If updating dates or percentage, validate the new allocation
    if (updates.startDate || updates.endDate || updates.allocationPercentage) {
      const validation = await this.validateAllocation(
        allocation.resourceId,
        updates.startDate || allocation.startDate,
        updates.endDate || allocation.endDate,
        updates.allocationPercentage || allocation.allocationPercentage
      );

      if (!validation.isValid) {
        throw new ConflictException(`Updated allocation would cause conflicts: ${validation.conflicts.length} conflicts found`);
      }
    }

    // Update allocation
    Object.assign(allocation, updates);
    return this.resourceAllocationRepository.save(allocation);
  }

  async removeAllocation(allocationId: string): Promise<void> {
    const allocation = await this.resourceAllocationRepository.findOne({
      where: { id: allocationId },
    });

    if (!allocation) {
      throw new NotFoundException('Resource allocation not found');
    }

    await this.resourceAllocationRepository.remove(allocation);
  }

  async getCrossProjectView(organizationId: string): Promise<Array<{
    resourceId: string;
    totalAllocation: number;
    projects: Array<{
      projectId: string;
      projectName: string;
      allocationPercentage: number;
      startDate: Date;
      endDate: Date;
    }>;
  }>> {
    const allocations = await this.resourceAllocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.project', 'project')
      .where('project.organizationId = :organizationId', { organizationId })
      .orderBy('allocation.resourceId', 'ASC')
      .addOrderBy('allocation.startDate', 'ASC')
      .getMany();

    // Group by resource
    const resourceMap = new Map<string, Array<ResourceAllocation>>();
    
    for (const allocation of allocations) {
      const existing = resourceMap.get(allocation.resourceId) || [];
      existing.push(allocation);
      resourceMap.set(allocation.resourceId, existing);
    }

    return Array.from(resourceMap.entries()).map(([resourceId, resourceAllocations]) => {
      const totalAllocation = resourceAllocations.reduce((sum, alloc) => sum + alloc.allocationPercentage, 0);
      const projects = resourceAllocations.map(alloc => ({
        projectId: alloc.projectId,
        projectName: alloc.project.name,
        allocationPercentage: alloc.allocationPercentage,
        startDate: alloc.startDate,
        endDate: alloc.endDate,
      }));

      return {
        resourceId,
        totalAllocation,
        projects,
      };
    });
  }

  async getResourceAllocationById(allocationId: string): Promise<ResourceAllocation> {
    const allocation = await this.resourceAllocationRepository.findOne({
      where: { id: allocationId },
      relations: ['project'],
    });

    if (!allocation) {
      throw new NotFoundException('Resource allocation not found');
    }

    return allocation;
  }

  async getProjectAllocations(projectId: string): Promise<ResourceAllocation[]> {
    return this.resourceAllocationRepository.find({
      where: { projectId },
      relations: ['project'],
      order: { startDate: 'ASC' },
    });
  }
}
