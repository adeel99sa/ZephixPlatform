import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';  // Fix path
import { AdminGuard } from '../../guards/admin.guard';  // Fix path

// DTOs (to be created)
interface PaginationDto {
  page: number;
  limit: number;
}

interface InviteUsersDto {
  emails: string[];
  role: string;
  message?: string;
}

interface CreateRoleDto {
  name: string;
  description: string;
  permissions: string[];
}

@ApiTags('Admin - Organization')
@ApiBearerAuth()
@Controller('admin/organization')
@UseGuards(JwtAuthGuard, AdminGuard)
export class OrganizationAdminController {
  
  @Get('overview')
  @ApiOperation({ summary: 'Get organization overview' })
  @ApiResponse({
    status: 200,
    description: 'Organization overview retrieved successfully',
  })
  async getOverview() {
    return {
      profile: {
        name: 'Zephix Organization',
        domain: 'zephix.ai',
        industry: 'Technology',
        size: 'Enterprise',
        createdAt: new Date('2024-01-01'),
        status: 'active'
      },
      plan: {
        name: 'Enterprise Pro',
        features: ['AI Features', 'Advanced Analytics', 'Priority Support'],
        limits: {
          users: 1000,
          projects: 500,
          storage: '1TB'
        },
        nextBilling: new Date('2024-12-01')
      },
      usage: {
        users: {
          total: 45,
          active: 38,
          inactive: 7
        },
        projects: {
          total: 23,
          active: 18,
          completed: 5
        },
        storage: {
          used: '45GB',
          available: '955GB'
        }
      }
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get paginated users with roles' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async getUsers(@Query() pagination: PaginationDto) {
    // Mock data - replace with actual service call
    const { page = 1, limit = 20 } = pagination;
    
    return {
      users: [
        {
          id: '1',
          email: 'admin@zephix.ai',
          firstName: 'Admin',
          lastName: 'User',
          role: 'owner',
          status: 'active',
          lastActive: new Date(),
          joinedAt: new Date('2024-01-01')
        },
        {
          id: '2',
          email: 'pm@zephix.ai',
          firstName: 'Project',
          lastName: 'Manager',
          role: 'pm',
          status: 'active',
          lastActive: new Date(),
          joinedAt: new Date('2024-01-15')
        }
      ],
      pagination: {
        page,
        limit,
        total: 45,
        totalPages: 3
      }
    };
  }

  @Post('users/invite')
  @ApiOperation({ summary: 'Bulk invite users' })
  @ApiResponse({
    status: 201,
    description: 'Users invited successfully',
  })
  async inviteUsers(@Body() inviteDto: InviteUsersDto) {
    const { emails, role, message } = inviteDto;
    
    // Mock invitation logic - replace with actual service call
    const invitations = emails.map(email => ({
      email,
      role,
      status: 'pending',
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }));

    return {
      message: `Invited ${emails.length} users`,
      invitations,
      success: true
    };
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get role matrix' })
  @ApiResponse({
    status: 200,
    description: 'Roles retrieved successfully',
  })
  async getRoles() {
    return {
      roles: [
        {
          name: 'owner',
          description: 'Full system access',
          permissions: ['*'],
          userCount: 1,
          isCustom: false
        },
        {
          name: 'admin',
          description: 'Administrative access',
          permissions: [
            'users.manage',
            'projects.manage',
            'templates.manage',
            'reports.view'
          ],
          userCount: 3,
          isCustom: false
        },
        {
          name: 'pm',
          description: 'Project management access',
          permissions: [
            'projects.manage',
            'templates.view',
            'reports.view'
          ],
          userCount: 15,
          isCustom: false
        },
        {
          name: 'viewer',
          description: 'Read-only access',
          permissions: [
            'projects.view',
            'templates.view',
            'reports.view'
          ],
          userCount: 26,
          isCustom: false
        }
      ]
    };
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create custom role with permissions' })
  @ApiResponse({
    status: 201,
    description: 'Custom role created successfully',
  })
  async createCustomRole(@Body() roleDto: CreateRoleDto) {
    const { name, description, permissions } = roleDto;
    
    // Mock role creation - replace with actual service call
    const newRole = {
      id: `role_${Date.now()}`,
      name,
      description,
      permissions,
      isCustom: true,
      createdAt: new Date(),
      userCount: 0
    };

    return {
      message: 'Custom role created successfully',
      role: newRole,
      success: true
    };
  }
}
