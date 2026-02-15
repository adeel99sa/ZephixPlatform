/**
 * Phase 3D: Production Hardening Module
 *
 * Registers controllers and providers for:
 * - System metrics endpoint
 * - Backup readiness endpoint
 * - Plan-aware rate limiting guard
 *
 * Imported once in AppModule.
 */
import { Module } from '@nestjs/common';
import { MetricsController } from './controllers/metrics.controller';
import { BackupReadinessController } from './controllers/backup-readiness.controller';
import { EnvProofController } from './controllers/env-proof.controller';
import { SystemIdentityController } from './controllers/system-identity.controller';
import { PlanRateLimitGuard } from './guards/plan-rate-limit.guard';

@Module({
  controllers: [
    MetricsController,
    BackupReadinessController,
    EnvProofController,
    SystemIdentityController,
  ],
  providers: [PlanRateLimitGuard],
  exports: [PlanRateLimitGuard],
})
export class ProductionHardeningModule {}
