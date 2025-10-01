import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from '../entities/resource.entity';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { Task } from '../../tasks/entities/task.entity';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { UserWorkspace } from '../../workspaces/entities/user-workspace.entity';
import { NotificationService } from '../../notifications/notification.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, ResourceType } from '../../audit/entities/audit-log.entity';
import { NotificationType, NotificationPriority } from '../../notifications/entities/notification.entity';

export interface AllocationRequest {
  resourceId: string;
  taskId: string;
  percentage: number;
  startDate: Date;
  endDate: Date;
  justification?: string;
  requestedBy: string;
}

export interface AllocationResponse {
  success: boolean;
  allocationId?: string;
  message: string;
  requiresApproval?: boolean;
  approvalRequiredBy?: string[];
}

export interface AllocationThreshold {
  resourceId: string;
  threshold: number;
  requiresJustification: boolean;
  requiresApproval: boolean;
  approvalRequiredBy: string[];
}

@Injectable()
export class ResourceAllocationService {
  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(ResourceAllocation)
    private allocationRepository: Repository<ResourceAllocation>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(UserWorkspace)
    private userWorkspaceRepository: Repository<UserWorkspace>,
    private notificationService: NotificationService,
    private auditService: AuditService,
  ) {}

  async allocateResource(request: AllocationRequest): Promise<AllocationResponse> {
    // Validate request
    await this.validateAllocationRequest(request);

    // Get resource and current allocations
    const resource = await this.resourceRepository.findOne({
      where: { id: request.resourceId },
      relations: ['allocations', 'team'],
    });

    if (!resource) {
      throw new BadRequestException('Resource not found');
    }

    // Check current allocation
    const currentAllocation = await this.getCurrentAllocation(resource.id, request.startDate, request.endDate);
    const newTotalAllocation = currentAllocation + request.percentage;

    // Check threshold
    const threshold = resource.allocationThreshold || 100;
    const requiresJustification = newTotalAllocation > threshold;
    const requiresApproval = newTotalAllocation > (threshold * 1.2); // 120% threshold

    // Check if justification is required
    if (requiresJustification && !request.justification) {
      return {
        success: false,
        message: `Allocation exceeds threshold (${threshold}%). Justification required.`,
        requiresApproval: true,
      };
    }

    // Check if approval is required
    if (requiresApproval) {
      return await this.requestApproval(request, resource, newTotalAllocation);
    }

    // Create allocation
    const allocation = this.allocationRepository.create({
      resourceId: request.resourceId,
      taskId: request.taskId,
      allocationPercentage: request.percentage,
      startDate: request.startDate,
      endDate: request.endDate,
      justification: request.justification,
      status: 'active',
      createdBy: request.requestedBy,
    });

    const savedAllocation = await this.allocationRepository.save(allocation);

    // Update resource current allocation
    await this.updateResourceAllocation(resource.id);

    // Send notifications if over threshold
    if (newTotalAllocation > threshold) {
      await this.sendOverallocationNotification(resource, newTotalAllocation, threshold);
    }

    // Log audit
    await this.auditService.log({
      userId: request.requestedBy,
      organizationId: resource.organizationId,
      action: AuditAction.RESOURCE_ALLOCATE,
      resourceType: ResourceType.RESOURCE,
      resourceId: resource.id,
      newValues: {
        taskId: request.taskId,
        percentage: request.percentage,
        startDate: request.startDate,
        endDate: request.endDate,
        justification: request.justification,
      },
      description: `Resource allocated: ${request.percentage}% to task ${request.taskId}`,
    });

    return {
      success: true,
      allocationId: Array.isArray(savedAllocation) ? savedAllocation[0].id : savedAllocation.id,
      message: 'Resource allocated successfully',
    };
  }

  async deallocateResource(allocationId: string, userId: string): Promise<void> {
    const allocation = await this.allocationRepository.findOne({
      where: { id: allocationId },
      relations: ['resource'],
    });

    if (!allocation) {
      throw new BadRequestException('Allocation not found');
    }

    // Update allocation status
    allocation.status = 'inactive';
    allocation.updatedAt = new Date();
    await this.allocationRepository.save(allocation);

    // Update resource current allocation
    await this.updateResourceAllocation(allocation.resourceId);

    // Log audit
    await this.auditService.log({
      userId,
      organizationId: allocation.resource.organizationId,
      action: AuditAction.RESOURCE_DEALLOCATE,
      resourceType: ResourceType.RESOURCE,
      resourceId: allocation.resourceId,
      oldValues: {
        taskId: allocation.taskId,
        allocationPercentage: allocation.allocationPercentage,
        status: 'active',
      },
      newValues: {
        status: 'inactive',
      },
      description: `Resource deallocated: ${allocation.allocationPercentage}% from task ${allocation.taskId}`,
    });
  }

  async getCurrentAllocation(resourceId: string, startDate?: Date, endDate?: Date): Promise<number> {
    const query = this.allocationRepository
      .createQueryBuilder('allocation')
      .where('allocation.resourceId = :resourceId', { resourceId })
      .andWhere('allocation.status = :status', { status: 'active' });

    if (startDate && endDate) {
      query.andWhere(
        '(allocation.startDate <= :endDate AND allocation.endDate >= :startDate)',
        { startDate, endDate }
      );
    }

    const allocations = await query.getMany();
    return allocations.reduce((total, allocation) => total + allocation.allocationPercentage, 0);
  }

  async getResourceUtilization(resourceId: string, startDate: Date, endDate: Date): Promise<{
    resourceId: string;
    totalCapacity: number;
    currentAllocation: number;
    utilizationPercentage: number;
    isOverallocated: boolean;
    threshold: number;
    allocations: Array<{
      taskId: string;
      allocationPercentage: number;
      startDate: Date;
      endDate: Date;
      justification?: string;
    }>;
  }> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['allocations'],
    });

    if (!resource) {
      throw new BadRequestException('Resource not found');
    }

    const currentAllocation = await this.getCurrentAllocation(resourceId, startDate, endDate);
    const utilizationPercentage = (currentAllocation / (resource.capacityHoursPerWeek || 100)) * 100;
    const isOverallocated = currentAllocation > (resource.allocationThreshold || 100);

    const allocations = await this.allocationRepository.find({
      where: {
        resourceId,
        status: 'active',
      },
      relations: ['task'],
    });

    return {
      resourceId,
      totalCapacity: resource.capacityHoursPerWeek || 100,
      currentAllocation,
      utilizationPercentage,
      isOverallocated,
      threshold: resource.allocationThreshold || 100,
      allocations: allocations.map(allocation => ({
        taskId: allocation.taskId,
        allocationPercentage: allocation.allocationPercentage,
        startDate: allocation.startDate,
        endDate: allocation.endDate,
        justification: allocation.justification,
      })),
    };
  }

  async getTeamUtilization(teamId: string, startDate: Date, endDate: Date): Promise<{
    teamId: string;
    totalCapacity: number;
    currentAllocation: number;
    utilizationPercentage: number;
    isOverallocated: boolean;
    resources: Array<{
      resourceId: string;
      resourceName: string;
      capacity: number;
      currentAllocation: number;
      utilizationPercentage: number;
      isOverallocated: boolean;
    }>;
  }> {
    const resources = await this.resourceRepository.find({
      where: { teamId },
      relations: ['allocations'],
    });

    let totalCapacity = 0;
    let totalAllocation = 0;
    const resourceUtilizations = [];

    for (const resource of resources) {
      const currentAllocation = await this.getCurrentAllocation(resource.id, startDate, endDate);
      const utilizationPercentage = (currentAllocation / (resource.capacityHoursPerWeek || 100)) * 100;
      const isOverallocated = currentAllocation > (resource.allocationThreshold || 100);

      totalCapacity += resource.capacityHoursPerWeek || 100;
      totalAllocation += currentAllocation;

      resourceUtilizations.push({
        resourceId: resource.id,
        resourceName: resource.name,
        capacity: resource.capacityHoursPerWeek || 100,
        currentAllocation,
        utilizationPercentage,
        isOverallocated,
      });
    }

    const teamUtilizationPercentage = totalCapacity > 0 ? (totalAllocation / totalCapacity) * 100 : 0;
    const isTeamOverallocated = totalAllocation > totalCapacity;

    return {
      teamId,
      totalCapacity,
      currentAllocation: totalAllocation,
      utilizationPercentage: teamUtilizationPercentage,
      isOverallocated: isTeamOverallocated,
      resources: resourceUtilizations,
    };
  }

  async setAllocationThreshold(
    resourceId: string,
    threshold: number,
    requiresJustification: boolean,
    requiresApproval: boolean,
    approvalRequiredBy: string[],
    userId: string,
  ): Promise<void> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new BadRequestException('Resource not found');
    }

    const oldThreshold = resource.allocationThreshold;
    const oldRequiresJustification = resource.requiresJustification;

    resource.allocationThreshold = threshold;
    resource.requiresJustification = requiresJustification;
    resource.requiresApproval = requiresApproval;
    resource.approvalRequiredBy = approvalRequiredBy;

    await this.resourceRepository.save(resource);

    // Log audit
    await this.auditService.log({
      userId,
      organizationId: resource.organizationId,
      action: AuditAction.RESOURCE_UPDATE,
      resourceType: ResourceType.RESOURCE,
      resourceId,
      oldValues: {
        allocationThreshold: oldThreshold,
        requiresJustification: oldRequiresJustification,
      },
      newValues: {
        allocationThreshold: threshold,
        requiresJustification,
        requiresApproval,
        approvalRequiredBy,
      },
      description: `Allocation threshold updated: ${threshold}%`,
    });
  }

  private async validateAllocationRequest(request: AllocationRequest): Promise<void> {
    if (request.percentage <= 0 || request.percentage > 100) {
      throw new BadRequestException('Allocation percentage must be between 1 and 100');
    }

    if (request.startDate >= request.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check if task exists
    const task = await this.taskRepository.findOne({
      where: { id: request.taskId },
    });

    if (!task) {
      throw new BadRequestException('Task not found');
    }
  }

  private async requestApproval(
    request: AllocationRequest,
    resource: Resource,
    newTotalAllocation: number,
  ): Promise<AllocationResponse> {
    // Create pending allocation
    const allocation = this.allocationRepository.create({
      resourceId: request.resourceId,
      taskId: request.taskId,
      allocationPercentage: request.percentage,
      startDate: request.startDate,
      endDate: request.endDate,
      justification: request.justification,
      status: 'pending_approval',
      createdBy: request.requestedBy,
    });

    const savedAllocation = await this.allocationRepository.save(allocation);

    // Send approval notifications
    const approvers = resource.approvalRequiredBy || [];
    for (const approverId of approvers) {
      await this.notificationService.create({
        userId: approverId,
        type: NotificationType.RESOURCE_ALLOCATION_REQUEST,
        title: 'Resource Allocation Approval Required',
        message: `Resource allocation request for ${resource.name} (${request.percentage}%) requires your approval. Total allocation will be ${newTotalAllocation}%.`,
        priority: NotificationPriority.HIGH,
        data: {
          resourceId: resource.id,
          resourceName: resource.name,
          allocationId: Array.isArray(savedAllocation) ? savedAllocation[0].id : savedAllocation.id,
          allocationPercentage: request.percentage,
          totalAllocation: newTotalAllocation,
          justification: request.justification,
          actionUrl: `/resources/allocations/${savedAllocation.id}/approve`,
          actionText: 'Review Request',
        },
      });
    }

    return {
      success: false,
      allocationId: savedAllocation.id,
      message: `Allocation exceeds approval threshold. Approval required from ${approvers.length} approver(s).`,
      requiresApproval: true,
      approvalRequiredBy: approvers,
    };
  }

  private async updateResourceAllocation(resourceId: string): Promise<void> {
    const currentAllocation = await this.getCurrentAllocation(resourceId);
    
    await this.resourceRepository.update(resourceId, {
      currentAllocation,
      isOverallocated: currentAllocation > 100,
    });
  }

  private async sendOverallocationNotification(
    resource: Resource,
    currentAllocation: number,
    threshold: number,
  ): Promise<void> {
    // Get team members and workspace admins
    const teamMembers = resource.teamId ? await this.getTeamMembers(resource.teamId) : [];
    const workspaceAdmins = resource.organizationId ? await this.getWorkspaceAdmins(resource.organizationId) : [];

    const recipients = [...teamMembers.map(m => m.userId), ...workspaceAdmins];

    for (const recipientId of recipients) {
      await this.notificationService.create({
        userId: recipientId,
        type: NotificationType.RESOURCE_OVERALLOCATION,
        title: 'Resource Overallocation Alert',
        message: `${resource.name} is overallocated at ${currentAllocation}% (threshold: ${threshold}%)`,
        priority: NotificationPriority.HIGH,
        data: {
          resourceId: resource.id,
          resourceName: resource.name,
          currentAllocation,
          threshold,
          actionUrl: `/resources/${resource.id}`,
          actionText: 'View Resource',
        },
      });
    }
  }

  private async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      // Real database query to get team members
      const teamMembers = await this.teamMemberRepository.find({
        where: {
          teamId,
          isActive: true,
        },
        relations: ['user'],
      });

      return teamMembers;
    } catch (error) {
      console.error('Failed to get team members:', error);
      return [];
    }
  }

  private async getWorkspaceAdmins(organizationId: string): Promise<string[]> {
    try {
      // Real database query to get workspace admins
      const workspaceAdmins = await this.userWorkspaceRepository.find({
        where: {
          role: 'admin' as any,
          isActive: true,
        },
        relations: ['workspace'],
      });

      // Filter by organization and return user IDs
      return workspaceAdmins
        .filter(uw => uw.workspace?.organizationId === organizationId)
        .map(uw => uw.userId);
    } catch (error) {
      console.error('Failed to get workspace admins:', error);
      return [];
    }
  }
}
