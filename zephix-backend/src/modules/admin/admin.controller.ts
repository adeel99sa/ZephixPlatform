import {
  Controller,
  Get,
  UseGuards,
  Request,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin statistics' })
  @ApiResponse({
    status: 200,
    description: 'Admin statistics retrieved successfully',
  })
  async getStats(@Request() req) {
    try {
      return await this.adminService.getStatistics();
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch statistics');
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health' })
  @ApiResponse({
    status: 200,
    description: 'System health retrieved successfully',
  })
  async getSystemHealth() {
    try {
      return await this.adminService.getSystemHealth();
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch system health');
    }
  }
}
