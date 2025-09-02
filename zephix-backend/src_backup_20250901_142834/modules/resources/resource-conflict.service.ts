import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceConflict } from './entities/resource-conflict.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { ResourceValidationService } from './resource-validation.service';

@Injectable()
export class ResourceConflictService {
  constructor(
    @InjectRepository(ResourceAllocation)
    private allocationRepo: Repository<ResourceAllocation>,
    @InjectRepository(ResourceConflict)
    private conflictRepo: Repository<ResourceConflict>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    private validationService: ResourceValidationService, // Add this
  ) {}

  // Replace the createAllocation method with this validated version
  async createAllocation(data: any): Promise<ResourceAllocation> {
    // Validate input data
    await this.validationService.validateAllocation(data);

    // Check for conflicts
    const conflicts = await this.checkAllocationConflicts(
      data.resourceId,
      data.startDate,
      data.endDate,
      data.allocationPercentage,
    );

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Cannot create allocation due to resource conflicts',
        conflicts: conflicts,
      });
    }

    // Create allocation with audit trail
    const allocationData = {
      ...data,
      createdAt: new Date(),
      createdBy: 'system', // Should be actual user ID from request
    };

    // Log the creation
    console.log('Creating allocation:', {
      resourceId: data.resourceId,
      projectId: data.projectId,
      dateRange: `${data.startDate} to ${data.endDate}`,
      percentage: data.allocationPercentage,
    });

    return this.allocationRepo.save(allocationData);
  }

  // Update allocation with conflict prevention
  async updateAllocation(
    id: string,
    allocationData: any,
  ): Promise<ResourceAllocation> {
    const existing = await this.allocationRepo.findOne({ where: { id } });
    if (!existing) {
      throw new Error('Allocation not found');
    }

    // Check conflicts with the updated data
    const conflicts = await this.checkAllocationConflicts(
      allocationData.resourceId || existing.resourceId,
      allocationData.startDate || existing.startDate,
      allocationData.endDate || existing.endDate,
      allocationData.allocationPercentage || existing.allocationPercentage,
    );

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Update would create conflicts',
        conflicts: conflicts,
      });
    }

    return this.allocationRepo.save({ ...existing, ...allocationData });
  }

  // Check for conflicts before creating an allocation
  async checkAllocationConflicts(
    resourceId: string,
    startDate: Date,
    endDate: Date,
    allocationPercentage: number,
  ): Promise<
    Array<{
      date: string;
      totalAllocation: number;
      severity: string;
    }>
  > {
    // Get existing allocations for this resource in the date range
    const existingAllocations = await this.allocationRepo.find({
      where: [
        {
          resourceId,
          startDate: Between(new Date(startDate), new Date(endDate)),
        },
        {
          resourceId,
          endDate: Between(new Date(startDate), new Date(endDate)),
        },
        {
          resourceId,
          startDate: MoreThan(new Date(startDate)),
          endDate: MoreThan(new Date(endDate)),
        },
      ],
    });

    const conflicts: Array<{
      date: string;
      totalAllocation: number;
      severity: string;
    }> = [];

    // Check each day in the new allocation period
    let currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
      const dateKey = currentDate.toISOString().split('T')[0];

      // Calculate total allocation for this date
      let totalAllocation = Number(allocationPercentage);

      // Add existing allocations for this date
      for (const existing of existingAllocations) {
        const existingStart = new Date(existing.startDate);
        const existingEnd = new Date(existing.endDate);

        if (currentDate >= existingStart && currentDate <= existingEnd) {
          totalAllocation += Number(existing.allocationPercentage);
        }
      }

      if (totalAllocation > 100) {
        conflicts.push({
          date: dateKey,
          totalAllocation,
          severity: this.calculateSeverity(totalAllocation),
        });
      }

      // Move to next day
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return conflicts;
  }

  // Run every hour to detect conflicts
  @Cron(CronExpression.EVERY_HOUR)
  async detectConflicts() {
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const allocations = await this.allocationRepo.find({
      where: {
        startDate: Between(new Date(), next30Days),
      },
    });

    const conflictsByDateAndResource = new Map();

    // Group allocations by resource and date
    for (const allocation of allocations) {
      const currentDate = new Date(allocation.startDate);

      while (currentDate <= allocation.endDate && currentDate <= next30Days) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const key = `${allocation.resourceId}-${dateKey}`;

        if (!conflictsByDateAndResource.has(key)) {
          conflictsByDateAndResource.set(key, []);
        }

        conflictsByDateAndResource.get(key).push(allocation);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Detect and save conflicts
    for (const [key, dayAllocations] of conflictsByDateAndResource) {
      const [resourceId, dateStr] = key.split('-');
      const totalAllocation = dayAllocations.reduce(
        (sum, a) => sum + Number(a.allocationPercentage),
        0,
      );

      if (totalAllocation > 100) {
        const severity = this.calculateSeverity(totalAllocation);

        // Check if conflict already exists
        const existingConflict = await this.conflictRepo.findOne({
          where: {
            resourceId,
            conflictDate: new Date(dateStr),
            resolved: false,
          },
        });

        if (!existingConflict) {
          const conflict = this.conflictRepo.create({
            resourceId,
            conflictDate: new Date(dateStr),
            totalAllocation,
            severity,
            affectedProjects: dayAllocations.map((a) => ({
              projectId: a.projectId,
              projectName: 'Unknown', // Will be populated from separate query if needed
              taskId: a.taskId,
              taskName: 'Unknown', // Will be populated from separate query if needed
              allocation: Number(a.allocationPercentage),
            })),
          });

          await this.conflictRepo.save(conflict);
        }
      }
    }
  }

  private calculateSeverity(
    totalAllocation: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (totalAllocation <= 110) return 'low';
    if (totalAllocation <= 125) return 'medium';
    if (totalAllocation <= 150) return 'high';
    return 'critical';
  }

  async getActiveConflicts() {
    return this.conflictRepo.find({
      where: {
        resolved: false,
        conflictDate: MoreThan(new Date()),
      },
      order: {
        severity: 'DESC',
        conflictDate: 'ASC',
      },
    });
  }

  async getConflictsByResource(resourceId: string) {
    return this.conflictRepo.find({
      where: {
        resourceId,
        resolved: false,
      },
      order: {
        conflictDate: 'ASC',
      },
    });
  }

  async createTestData() {
    console.log('Creating test data for resource conflicts...');

    // Get or create organization
    let org = await this.orgRepo.findOne({
      where: { name: 'Test Company' },
    });

    if (!org) {
      org = await this.orgRepo.save({
        name: 'Test Company',
        domain: 'testcompany.com',
      });
    }

    // Create test users (resources)
    const users: User[] = [];
    const userNames = [
      'Sarah Johnson',
      'Mike Chen',
      'Emily Davis',
      'John Smith',
      'Lisa Wong',
    ];

    for (const name of userNames) {
      const email = name.toLowerCase().replace(' ', '.') + '@testcompany.com';
      let user = await this.userRepo.findOne({ where: { email } });

      if (!user) {
        user = await this.userRepo.save({
          email,
          name,
          password: 'password123', // Will be hashed by entity
          organizationId: org.id,
          role: 'user',
        });
      }
      users.push(user);
    }

    // Create test projects
    const projects: Project[] = [];
    const projectNames = [
      'Customer Portal Redesign',
      'API Migration Phase 2',
      'Mobile App Launch',
      'Infrastructure Upgrade',
      'Data Analytics Platform',
    ];

    for (const name of projectNames) {
      let project = await this.projectRepo.findOne({
        where: { name, organizationId: org.id },
      });

      if (!project) {
        project = await this.projectRepo.save({
          name,
          description: `${name} - Critical Q1 2026 deliverable`,
          organizationId: org.id,
          status: 'planning' as any,
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-03-31'),
          createdById: users[0].id,
        });
      }
      projects.push(project);
    }

    // Create overlapping allocations to trigger conflicts
    const allocations = [
      // Sarah Johnson - OVERALLOCATED (140% on multiple days)
      {
        resourceId: users[0].id,
        projectId: projects[0].id,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-15'),
        allocationPercentage: 80,
        hoursPerDay: 6.4,
      },
      {
        resourceId: users[0].id,
        projectId: projects[1].id,
        startDate: new Date('2025-09-10'),
        endDate: new Date('2025-09-20'),
        allocationPercentage: 60,
        hoursPerDay: 4.8,
      },

      // Mike Chen - CRITICAL OVERALLOCATION (180% on some days)
      {
        resourceId: users[1].id,
        projectId: projects[1].id,
        startDate: new Date('2025-09-05'),
        endDate: new Date('2025-09-25'),
        allocationPercentage: 100,
        hoursPerDay: 8,
      },
      {
        resourceId: users[1].id,
        projectId: projects[2].id,
        startDate: new Date('2025-09-10'),
        endDate: new Date('2025-09-30'),
        allocationPercentage: 80,
        hoursPerDay: 6.4,
      },

      // Emily Davis - Normal allocation (no conflict)
      {
        resourceId: users[2].id,
        projectId: projects[3].id,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-30'),
        allocationPercentage: 75,
        hoursPerDay: 6,
      },
    ];

    // Clear existing allocations
    await this.allocationRepo.delete({});

    // Insert new allocations
    for (const allocation of allocations) {
      await this.allocationRepo.save(allocation);
    }

    console.log('✅ Created test data:');
    console.log(`   - ${users.length} users`);
    console.log(`   - ${projects.length} projects`);
    console.log(`   - ${allocations.length} resource allocations`);
    console.log('\n🎯 Expected conflicts:');
    console.log('   - Sarah Johnson: 140% allocated Sept 10-15');
    console.log('   - Mike Chen: 180% allocated Sept 10-25');
    console.log('   - Emily Davis: No conflicts (75% allocated)');

    return {
      message: 'Test data created successfully',
      users: users.length,
      projects: projects.length,
      allocations: allocations.length,
      expectedConflicts: 2,
    };
  }
}
