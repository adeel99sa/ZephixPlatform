import { Module } from '@nestjs/common';
import { ClaudeService } from '../ai/claude.service';
import { LLMProviderService } from '../ai/llm-provider.service';
import { EmailService } from './services/email.service';
import { MetricsService } from '../observability/metrics.service';
import { VirusScanService } from './services/virus-scan.service';
import { AuditService } from './services/audit.service';

/**
 * SharedModule
 *
 * Centralizes shared stateless services that are used across multiple modules.
 * This module no longer contains guards or data layer dependencies to avoid
 * circular dependencies and maintain clean separation of concerns.
 *
 * Services included:
 * - ClaudeService: AI service for LLM interactions
 * - LLMProviderService: LLM provider with data retention controls
 * - EmailService: Email sending service for notifications
 */
@Module({
  providers: [
    LLMProviderService, 
    ClaudeService, 
    EmailService,
    MetricsService,
    VirusScanService,
    AuditService
  ],
  exports: [
    LLMProviderService, 
    ClaudeService, 
    EmailService,
    MetricsService,
    VirusScanService,
    AuditService
  ],
})
export class SharedModule {}
