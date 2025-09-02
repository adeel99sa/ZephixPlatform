import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { UserDailyCapacity } from './entities/user-daily-capacity.entity';

@Injectable()
export class ResourceAllocationService {
  constructor(
    @InjectRepository(ResourceAllocation)
    private allocationRepository: Repository<ResourceAllocation>,
    @InjectRepository(UserDailyCapacity)
    private capacityRepository: Repository<UserDailyCapacity>,
    private dataSource: DataSource,
  ) {}

  async createAllocation(
    organizationId: string,
    userId: string,
    projectId: string,
    startDate: Date,
    endDate: Date,
    allocationPercentage: number,
  ) {
    // Validate dates
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (allocationPercentage < 1 || allocationPercentage > 100) {
      throw new BadRequestException(
        'Allocation percentage must be between 1 and 100',
      );
    }

    // Check for conflicts
    const conflicts = await this.checkCapacityConflicts(
      organizationId,
      userId,
      startDate,
      endDate,
      allocationPercentage,
    );

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Resource overallocation detected',
        conflicts: conflicts,
        suggestions: await this.generateSuggestions(
          organizationId,
          startDate,
          endDate,
          allocationPercentage,
        ),
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
        allocationPercentage,
      });

      const savedAllocation = await queryRunner.manager.save(allocation);

      // Update daily capacity with proper accumulation
      await this.updateDailyCapacity(
        queryRunner.manager,
        organizationId,
        userId,
        startDate,
        endDate,
        allocationPercentage,
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
    allocationPercentage: number,
  ): Promise<
    Array<{ date: Date; currentAllocation: number; wouldBe: number }>
  > {
    const dailyCapacities = await this.capacityRepository.find({
      where: {
        organizationId,
        userId,
        capacityDate: Between(startDate, endDate),
      },
    });

    const conflicts: Array<{
      date: Date;
      currentAllocation: number;
      wouldBe: number;
    }> = [];
    for (const capacity of dailyCapacities) {
      const newTotal = capacity.allocatedPercentage + allocationPercentage;
      if (newTotal > 100) {
        conflicts.push({
          date: capacity.capacityDate,
          currentAllocation: capacity.allocatedPercentage,
          wouldBe: newTotal,
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
    allocationPercentage: number,
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
        where: { organizationId, userId, capacityDate: date },
      });

      if (existing) {
        existing.allocatedPercentage += allocationPercentage;
        await manager.save(UserDailyCapacity, existing);
      } else {
        await manager.save(UserDailyCapacity, {
          organizationId,
          userId,
          capacityDate: date,
          allocatedPercentage: allocationPercentage,
        });
      }
    }
  }

  private async generateSuggestions(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    requiredPercentage: number,
  ) {
    // Find users with capacity
    const availableUsers = await this.capacityRepository
      .createQueryBuilder('capacity')
      .select('capacity.userId')
      .addSelect('AVG(capacity.allocatedPercentage)', 'avgAllocation')
      .where('capacity.organizationId = :organizationId', { organizationId })
      .andWhere('capacity.capacityDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('capacity.userId')
      .having('AVG(capacity.allocatedPercentage) <= :maxAllocation', {
        maxAllocation: 100 - requiredPercentage,
      })
      .getRawMany();

    return availableUsers.slice(0, 3); // Return top 3 suggestions
  }
}
