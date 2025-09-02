import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { ResourceConflict } from '../entities/resource-conflict.entity';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(ResourceAllocation)
    private allocationRepository: Repository<ResourceAllocation>,
    @InjectRepository(ResourceConflict)
    private conflictRepository: Repository<ResourceConflict>,
  ) {}

  async allocateResource(data: any, organizationId: string) {
    // Check for conflicts
    const conflicts = await this.checkConflicts(
      data.resourceId,
      data.startDate,
      data.endDate,
      organizationId
    );

    if (conflicts.totalAllocation > 100) {
      // Create conflict record
      const conflict = this.conflictRepository.create({
        resourceId: data.resourceId,
        conflictDate: data.startDate,
        totalAllocation: conflicts.totalAllocation,
        affectedProjects: conflicts.projects,
        severity: conflicts.totalAllocation > 150 ? 'critical' : 'high',
      });
      await this.conflictRepository.save(conflict);

      if (conflicts.totalAllocation > 150) {
        throw new BadRequestException(
          `Resource is overallocated at ${conflicts.totalAllocation}%. Maximum allowed is 150%.`
        );
      }
    }

    const allocation = this.allocationRepository.create({
      ...data,
      organizationId,
    });
    return this.allocationRepository.save(allocation);
  }

  async checkConflicts(resourceId: string, startDate: Date, endDate: Date, organizationId: string) {
    const allocations = await this.allocationRepository.find({
      where: {
        resourceId,
        organizationId,
        startDate: LessThanOrEqual(endDate),
        endDate: MoreThanOrEqual(startDate),
      },
    });

    const totalAllocation = allocations.reduce((sum, a) => sum + Number(a.allocationPercentage), 0);
    
    return {
      totalAllocation,
      projects: allocations.map(a => ({
        projectId: a.projectId,
        allocation: a.allocationPercentage,
      })),
    };
  }

  async getResourceHeatMap(organizationId: string, startDate?: Date, endDate?: Date) {
    const where: any = { organizationId };
    if (startDate && endDate) {
      where.startDate = LessThanOrEqual(endDate);
      where.endDate = MoreThanOrEqual(startDate);
    }

    const allocations = await this.allocationRepository.find({ where });
    
    // Group by resource
    const heatMap = allocations.reduce((acc, allocation) => {
      if (!acc[allocation.resourceId]) {
        acc[allocation.resourceId] = {
          resourceId: allocation.resourceId,
          allocations: [],
          totalPercentage: 0,
        };
      }
      acc[allocation.resourceId].allocations.push(allocation);
      acc[allocation.resourceId].totalPercentage += Number(allocation.allocationPercentage);
      return acc;
    }, {});

    return Object.values(heatMap);
  }
}
