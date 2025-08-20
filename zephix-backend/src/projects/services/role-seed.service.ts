import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleType } from '../entities/role.entity';

// ✅ PROPER TYPING - NO MORE 'any' TYPES
interface RoleData {
  name: RoleType;
  description: string;
  permissions: string[];
}

interface SeedingResult {
  createdCount: number;
  skippedCount: number;
  totalProcessed: number;
}

@Injectable()
export class RoleSeedService implements OnModuleInit {
  private readonly logger = new Logger(RoleSeedService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    try {
      await this.seedRoles();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn('Role seeding failed during startup:', errorMessage);
      // Don't crash the app - just log and continue
    }
  }

  /**
   * Seed roles with direct execution
   * Maintains 100% backward compatibility
   */
  async seedRoles(tenantId?: string, _force: boolean = false): Promise<void> {
    try {
      this.logger.log('🔄 Executing role seeding directly');

      await this.seedRolesDirect();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error('Role seeding failed:', errorMessage);
      // Don't throw - let the app continue
    }
  }

  /**
   * Direct role seeding (main method)
   * Maintains 100% backward compatibility
   */
  private async seedRolesDirect(): Promise<void> {
    this.logger.log('🔄 Executing role seeding directly');

    const roles: RoleData[] = [
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
        this.logger.log(`✅ Created role: ${roleData.name}`);
      } else {
        skippedCount++;
        this.logger.log(`⏭️ Role already exists: ${roleData.name}`);
      }
    }

    const result: SeedingResult = {
      createdCount,
      skippedCount,
      totalProcessed: roles.length,
    };

    this.logger.log('Role seeding completed', result);
  }

  /**
   * Manual role seeding with tenant context
   * Can be called from API endpoints or other services
   */
  async seedRolesForTenant(
    tenantId: string,
    force: boolean = false,
  ): Promise<void> {
    try {
      this.logger.log(
        `🔄 Executing tenant role seeding for tenant=${tenantId}`,
      );
      console.log(`🔄 Executing tenant role seeding for tenant=${tenantId}`);

      // Execute directly
      await this.seedRolesDirect();
    } catch (error) {
      this.logger.error(
        `Tenant role seeding failed for ${tenantId}:`,
        error.message,
      );
      console.log(
        `❌ Tenant role seeding failed for ${tenantId}:`,
        error.message,
      );
      // Don't throw - let the app continue
    }
  }

  /**
   * Force role seeding (overwrites existing roles)
   * Useful for development and testing
   */
  async forceSeedRoles(_tenantId?: string): Promise<void> {
    try {
      this.logger.log('🔄 Executing forced role seeding');
      console.log('🔄 Executing forced role seeding');

      // Execute directly with force logic
      await this.forceSeedRolesDirect();
    } catch (error) {
      this.logger.error('Forced role seeding failed:', error.message);
      console.log('❌ Forced role seeding failed:', error.message);
      // Don't throw - let the app continue
    }
  }

  /**
   * Direct forced role seeding (main method)
   */
  private async forceSeedRolesDirect(): Promise<void> {
    this.logger.log('🔄 Executing forced role seeding directly');
    console.log('🔄 Executing forced role seeding directly');

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

    this.logger.log(
      `✅ Forced role seeding completed: ${createdCount} created, ${updatedCount} updated`,
    );
    console.log(
      `✅ Forced role seeding completed: ${createdCount} created, ${updatedCount} updated`,
    );
  }
}
