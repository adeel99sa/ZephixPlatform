import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaudeService } from '../ai/claude.service';
import { LLMProviderService } from '../ai/llm-provider.service';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { TeamMember } from '../projects/entities/team-member.entity';
import { EmailService } from './services/email.service';

/**
 * SharedModule
 * 
 * Centralizes shared services and guards that are used across multiple modules.
 * This prevents UnknownExportException errors by ensuring each provider is
 * declared in only one module.
 * 
 * Services included:
 * - ClaudeService: AI service for LLM interactions
 * - LLMProviderService: LLM provider with data retention controls
 * - ProjectPermissionGuard: Guard for project-level authorization
 * - EmailService: Email sending service for notifications
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TeamMember]),
  ],
  providers: [
    LLMProviderService,
    ClaudeService,
    ProjectPermissionGuard,
    EmailService,
  ],
  exports: [
    LLMProviderService,
    ClaudeService,
    ProjectPermissionGuard,
    EmailService,
  ],
})
export class SharedModule {}
