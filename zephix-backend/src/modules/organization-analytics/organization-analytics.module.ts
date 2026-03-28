/**
 * Phase 4A: Organization Analytics Module
 *
 * Cross-workspace executive analytics. Platform ADMIN only.
 * Read-only aggregation over existing tables.
 */
import { Module } from '@nestjs/common';
import { OrganizationAnalyticsController } from './controllers/organization-analytics.controller';
import { OrganizationAnalyticsService } from './services/organization-analytics.service';

@Module({
  controllers: [OrganizationAnalyticsController],
  providers: [OrganizationAnalyticsService],
  exports: [OrganizationAnalyticsService],
})
export class OrganizationAnalyticsModule {}
