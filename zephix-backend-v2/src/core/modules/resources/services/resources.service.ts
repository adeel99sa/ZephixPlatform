import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Resource } from '../entities/resource.entity';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { ResourceConflict } from '../entities/resource-conflict.entity';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(ResourceAllocation)
    private allocationRepository: Repository<ResourceAllocation>,
    @InjectRepository(ResourceConflict)
    private conflictRepository: Repository<ResourceConflict>,
  ) {}

  // Resource CRUD
  async create(data: any, organizationId: string) {
    const resource = this.resourceRepository.create({
      ...data,
      organization_id: organizationId,
    });
    return this.resourceRepository.save(resource);
  }

  async findAll(organizationId: string) {
    return this.resourceRepository.find({
      where: { organization_id: organizationId, is_active: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const resource = await this.resourceRepository.findOne({
      where: { id, organization_id: organizationId },
    });
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    return resource;
  }

  async update(id: string, data: any, organizationId: string) {
    const resource = await this.findOne(id, organizationId);
    Object.assign(resource, data);
    return this.resourceRepository.save(resource);
  }

  async remove(id: string, organizationId: string) {
    const resource = await this.findOne(id, organizationId);
    resource.is_active = false;
    return this.resourceRepository.save(resource);
  }

  // Allocation methods
  async allocateResource(data: any, organizationId: string) {
    const resource = await this.findOne(data.resourceId, organizationId);
    
    const conflicts = await this.checkConflicts(
      data.resourceId,
      data.startDate,
      data.endDate,
      organizationId
    );

    if (conflicts.totalAllocation + data.allocationPercentage > 100) {
      const conflict = this.conflictRepository.create({
        resourceId: data.resourceId,
        conflictDate: data.startDate,
        totalAllocation: conflicts.totalAllocation + data.allocationPercentage,
        conflictingProjects: conflicts.projects,
        severity: conflicts.totalAllocation > 120 ? 'critical' : 'high',
      });
      await this.conflictRepository.save(conflict);

      if (conflicts.totalAllocation + data.allocationPercentage > 150) {
        throw new BadRequestException(
          `Resource is overallocated at ${conflicts.totalAllocation + data.allocationPercentage}%. Maximum allowed is 150%.`
        );
      }
    }

    const allocation = this.allocationRepository.create({
      ...data,
      organization_id: organizationId,
    });
    return this.allocationRepository.save(allocation);
  }

  async checkConflicts(resourceId: string, startDate: Date, endDate: Date, organizationId: string) {
    const allocations = await this.allocationRepository.find({
      where: {
        resourceId,
        organization_id: organizationId,
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
    const resources = await this.findAll(organizationId);
    const heatMap = [];

    for (const resource of resources) {
      const allocations = await this.allocationRepository.find({
        where: {
          resourceId: resource.id,
          ...(startDate && endDate ? {
            startDate: LessThanOrEqual(endDate),
            endDate: MoreThanOrEqual(startDate),
          } : {}),
        },
      });

      const totalAllocation = allocations.reduce((sum, a) => sum + Number(a.allocationPercentage), 0);

      heatMap.push({
        resource,
        allocations,
        totalAllocation,
        status: totalAllocation > 120 ? 'critical' : totalAllocation > 100 ? 'warning' : totalAllocation > 80 ? 'busy' : 'available',
      });
    }

    return heatMap;
  }
}
