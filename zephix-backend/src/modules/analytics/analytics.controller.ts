import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post('track')
  @UseGuards(JwtAuthGuard)
  async track(@Body() event: any, @Request() req) {
    return this.analyticsService.track({
      ...event,
      userId: req.user.userId,
      organizationId: req.user.organizationId
    });
  }

  @Get('events')
  @UseGuards(JwtAuthGuard)
  async getEvents(@Request() req, @Query('eventName') eventName?: string) {
    return this.analyticsService.getEvents(req.user.organizationId, eventName);
  }

  @Get('soft-delete-stats')
  @UseGuards(JwtAuthGuard)
  async getSoftDeleteStats(@Request() req) {
    return this.analyticsService.getSoftDeleteStats(req.user.organizationId);
  }
}