import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAllocationDto } from './dto/create-allocation.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(ResourceAllocation)
    private resourceAllocationRepository: Repository<ResourceAllocation>,
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
}
