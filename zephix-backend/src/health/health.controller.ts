import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('health')
@ApiTags('Health')
export class HealthController {
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
}