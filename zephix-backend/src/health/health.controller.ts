import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'zephix-api',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  getDetailedHealth() {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'zephix-api',
      system: {
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        memory: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        node: process.version
      }
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  getReadiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString()
    };
  }

  @Get('user-exists')
  @ApiOperation({ summary: 'Check if user exists by email' })
  @ApiQuery({ name: 'email', description: 'Email address to check', example: 'user@example.com' })
  @ApiResponse({ status: 200, description: 'User existence check result' })
  @ApiResponse({ status: 400, description: 'Email parameter is required' })
  async checkUserExists(@Query('email') email: string) {
    if (!email) {
      return {
        error: 'Email parameter is required',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
        select: ['id', 'email', 'firstName', 'lastName', 'isActive', 'isEmailVerified', 'createdAt']
      });

      return {
        exists: !!user,
        timestamp: new Date().toISOString(),
        email: email.toLowerCase(),
        user: user ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt
        } : null
      };
    } catch (error) {
      return {
        error: 'Database query failed',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}