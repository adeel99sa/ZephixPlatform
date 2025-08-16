import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleType } from '../entities/role.entity';
import { QueueService } from '../../queue/queue.service';

@Injectable()
export class RoleSeedService implements OnModuleInit {
  private readonly logger = new Logger(RoleSeedService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private readonly queueService: QueueService,
  ) {}

  async onModuleInit() {
    try {
      await this.seedRoles();
    } catch (error) {
      console.log('⚠️ Role seeding skipped:', error.message);
      // Don't crash the app - just log and continue
    }
  }

  /**
   * Seed roles with background processing fallback
   * Tries to queue the job first, falls back to direct execution if queue fails
   */
  async seedRoles(tenantId?: string, force: boolean = false): Promise<void> {
    try {
      // Try to queue the role seeding job
      const jobId = await this.queueService.enqueueRoleSeed({
        tenantId,
        force,
        mode: 'startup'
      });
      
      this.logger.log(`🚀 Role seeding queued successfully as job=${jobId}`);
      console.log(`🚀 Role seeding queued successfully as job=${jobId}`);
      
    } catch (queueError) {
      this.logger.warn(`⚠️ Queue unavailable, falling back to direct role seeding: ${queueError.message}`);
      console.log('⚠️ Queue unavailable, falling back to direct role seeding');
      
      // Fallback to direct execution
      await this.seedRolesDirect();
    }
  }

  /**
   * Direct role seeding (fallback method)
   * Maintains 100% backward compatibility
   */
  private async seedRolesDirect(): Promise<void> {
    this.logger.log('🔄 Executing role seeding directly (fallback mode)');
    console.log('🔄 Executing role seeding directly (fallback mode)');
    
    const roles = [
      {
        name: RoleType.ADMIN,
        description: 'Full project administration permissions',
        permissions: ['create', 'read', 'update', 'delete', 'manage_team'],
      },
      {
        name: RoleType.PROJECT_MANAGER,
        description: 'Project management permissions',
        permissions: ['create', 'read', 'update', 'manage_team'],
      },
      {
        name: RoleType.EDITOR,
        description: 'Content editing permissions',
        permissions: ['create', 'read', 'update'],
      },
      {
        name: RoleType.DEVELOPER,
        description: 'Development-focused permissions',
        permissions: ['read', 'update'],
      },
      {
        name: RoleType.ANALYST,
        description: 'Analysis and reporting permissions',
        permissions: ['read', 'update'],
      },
      {
        name: RoleType.VIEWER,
        description: 'Read-only permissions',
        permissions: ['read'],
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const roleData of roles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
        createdCount++;
        console.log(`✅ Created role: ${roleData.name}`);
      } else {
        skippedCount++;
        console.log(`⏭️ Role already exists: ${roleData.name}`);
      }
    }

    this.logger.log(`✅ Direct role seeding completed: ${createdCount} created, ${skippedCount} skipped`);
    console.log(`✅ Direct role seeding completed: ${createdCount} created, ${skippedCount} skipped`);
  }

  /**
   * Manual role seeding with tenant context
   * Can be called from API endpoints or other services
   */
  async seedRolesForTenant(tenantId: string, force: boolean = false): Promise<void> {
    try {
      // Try to queue the tenant-specific role seeding job
      const jobId = await this.queueService.enqueueRoleSeed({
        tenantId,
        force,
        mode: 'tenant'
      });
      
      this.logger.log(`🚀 Tenant role seeding queued successfully as job=${jobId} for tenant=${tenantId}`);
      
    } catch (queueError) {
      this.logger.warn(`⚠️ Queue unavailable for tenant ${tenantId}, falling back to direct seeding: ${queueError.message}`);
      
      // Fallback to direct execution
      await this.seedRolesDirect();
    }
  }

  /**
   * Force role seeding (overwrites existing roles)
   * Useful for development and testing
   */
  async forceSeedRoles(tenantId?: string): Promise<void> {
    try {
      // Try to queue the forced role seeding job
      const jobId = await this.queueService.enqueueRoleSeed({
        tenantId,
        force: true,
        mode: 'manual'
      });
      
      this.logger.log(`🚀 Forced role seeding queued successfully as job=${jobId}`);
      
    } catch (queueError) {
      this.logger.warn(`⚠️ Queue unavailable for forced seeding, falling back to direct seeding: ${queueError.message}`);
      
      // Fallback to direct execution with force logic
      await this.forceSeedRolesDirect();
    }
  }

  /**
   * Direct forced role seeding (fallback method)
   */
  private async forceSeedRolesDirect(): Promise<void> {
    this.logger.log('🔄 Executing forced role seeding directly (fallback mode)');
    
    const roles = [
      {
        name: RoleType.ADMIN,
        description: 'Full project administration permissions',
        permissions: ['create', 'read', 'update', 'delete', 'manage_team'],
      },
      {
        name: RoleType.PROJECT_MANAGER,
        description: 'Project management permissions',
        permissions: ['create', 'read', 'update', 'manage_team'],
      },
      {
        name: RoleType.EDITOR,
        description: 'Content editing permissions',
        permissions: ['create', 'read', 'update'],
      },
      {
        name: RoleType.DEVELOPER,
        description: 'Development-focused permissions',
        permissions: ['read', 'update'],
      },
      {
        name: RoleType.ANALYST,
        description: 'Analysis and reporting permissions',
        permissions: ['read', 'update'],
      },
      {
        name: RoleType.VIEWER,
        description: 'Read-only permissions',
        permissions: ['read'],
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const roleData of roles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
        createdCount++;
        console.log(`✅ Created role: ${roleData.name}`);
      } else {
        // Update existing role
        existingRole.description = roleData.description;
        existingRole.permissions = roleData.permissions;
        await this.roleRepository.save(existingRole);
        updatedCount++;
        console.log(`🔄 Updated role: ${roleData.name}`);
      }
    }

    this.logger.log(`✅ Forced role seeding completed: ${createdCount} created, ${updatedCount} updated`);
    console.log(`✅ Forced role seeding completed: ${createdCount} created, ${updatedCount} updated`);
  }
}