import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(ResourceAllocation)
    private allocationRepository: Repository<ResourceAllocation>,
  ) {}

  async findAll(organizationId: string) {
    try {
      const resources = await this.resourceRepository.find({
        where: { organizationId, isActive: true },
        relations: ['allocations']
      });
      
      // Calculate current allocation for each resource
      const resourcesWithAllocation = resources.map(resource => {
        const totalAllocation = resource.allocations?.reduce((sum, a) => sum + a.allocationPercentage, 0) || 0;
        
        return {
          id: resource.id,
          name: resource.name,
          email: resource.email,
          role: resource.role,
          skills: resource.skills,
          capacity: resource.capacityHoursPerWeek,
          allocated: totalAllocation,
          available: 100 - totalAllocation,
          costPerHour: resource.costPerHour,
          isActive: resource.isActive,
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt
        };
      });
      
      return { data: resourcesWithAllocation };
    } catch (error) {
      console.error('Error fetching resources:', error);
      throw new BadRequestException('Failed to fetch resources');
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
      const existingAllocations = await this.allocationRepository.find({
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
      const allocation = this.allocationRepository.create({
        resourceId: allocationData.resourceId,
        projectId: allocationData.projectId,
        userId: allocationData.userId,
        startDate: new Date(allocationData.startDate),
        endDate: new Date(allocationData.endDate),
        allocationPercentage: allocationData.allocationPercentage,
        organizationId: allocationData.organizationId
      });

      const savedAllocation = await this.allocationRepository.save(allocation);

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
    return this.allocationRepository.find({
      where: { resourceId }
    });
  }
}
