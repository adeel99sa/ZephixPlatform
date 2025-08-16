import { Module, Global } from '@nestjs/common';
import { ClaudeService } from '../ai/claude.service';
import { LLMProviderService } from '../ai/llm-provider.service';
import { EmailService } from './services/email.service';

/**
 * SharedModule
 *
 * Centralizes shared stateless services that are used across multiple modules.
 * This module is GLOBAL to ensure LLMProviderService is available everywhere.
 * This module no longer contains guards or data layer dependencies to avoid
 * circular dependencies and maintain clean separation of concerns.
 *
 * Services included:
 * - ClaudeService: AI service for LLM interactions
 * - LLMProviderService: LLM provider with data retention controls
 * - EmailService: Email sending service for notifications
 */
@Global()
@Module({
  providers: [LLMProviderService, ClaudeService, EmailService],
  exports: [LLMProviderService, ClaudeService, EmailService],
})
export class SharedModule {}
