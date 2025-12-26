import { Module } from '@nestjs/common';
import { ClaudeService } from '../ai/claude.service';
import { LLMProviderService } from '../ai/llm-provider.service';
import { EmailService } from './services/email.service';
import { MetricsService } from '../observability/metrics.service';
import { VirusScanService } from './services/virus-scan.service';
import { AuditService } from './services/audit.service';
import { ResponseService } from './services/response.service';
import { AdminGuard } from './guards/admin.guard';

/**
 * SharedModule
 *
 * Centralizes shared stateless services that are used across multiple modules.
 * This module exports guards and services that are used across the application.
 *
 * Services included:
 * - ClaudeService: AI service for LLM interactions
 * - LLMProviderService: LLM provider with data retention controls
 * - EmailService: Email sending service for notifications
 * - AuditService: Audit logging service
 * - AdminGuard: Guard for admin-only endpoints
 */
@Module({
  providers: [
    LLMProviderService,
    ClaudeService,
    EmailService,
    MetricsService,
    VirusScanService,
    AuditService,
    ResponseService,
    AdminGuard,
  ],
  exports: [
    LLMProviderService,
    ClaudeService,
    EmailService,
    MetricsService,
    VirusScanService,
    AuditService,
    ResponseService,
    AdminGuard,
  ],
})
export class SharedModule {}
