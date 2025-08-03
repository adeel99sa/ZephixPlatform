import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleType } from '../entities/role.entity';

@Injectable()
export class RoleSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    await this.seedRoles();
  }

  private async seedRoles() {
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

    for (const roleData of roles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
        console.log(`✅ Created role: ${roleData.name}`);
      }
    }
  }
} 