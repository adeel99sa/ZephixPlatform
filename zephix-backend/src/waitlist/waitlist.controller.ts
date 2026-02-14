// File: zephix-backend/src/waitlist/waitlist.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/guards/admin.guard';
import { RateLimiterGuard } from '../common/guards/rate-limiter.guard';

@ApiTags('waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @UseGuards(RateLimiterGuard)
  @ApiOperation({ summary: 'Join the waitlist' })
  @ApiResponse({ status: 201, description: 'Successfully joined waitlist' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Invalid email domain' })
  async create(@Body() createWaitlistDto: CreateWaitlistDto) {
    return this.waitlistService.create(createWaitlistDto);
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all waitlist entries (Admin only)' })
  async getAll() {
    return this.waitlistService.getAll();
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get waitlist statistics (Admin only)' })
  async getStats() {
    return this.waitlistService.getStats();
  }

  @Get('admin/export')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Export waitlist as CSV (Admin only)' })
  async export(@Res() res: Response) {
    const data = await this.waitlistService.export();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=waitlist.csv');
    res.status(HttpStatus.OK).send(data.csv);
  }
}
