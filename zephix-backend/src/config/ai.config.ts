import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AIConfigService {
  constructor(private readonly configService: ConfigService) {}

  // File upload configuration
  get maxFileSize(): number {
    return this.configService.get<number>('AI_MAX_FILE_SIZE', 25 * 1024 * 1024); // 25MB default
  }

  get allowedFileTypes(): string[] {
    return this.configService.get<string[]>('AI_ALLOWED_FILE_TYPES', ['.pdf', '.docx', '.doc', '.txt']);
  }

  get virusScanningEnabled(): boolean {
    return this.configService.get<boolean>('AI_VIRUS_SCANNING_ENABLED', true);
  }

  get fileStoragePath(): string {
    return this.configService.get<string>('AI_FILE_STORAGE_PATH', './uploads/ai-analysis');
  }

  get fileRetentionDays(): number {
    return this.configService.get<number>('AI_FILE_RETENTION_DAYS', 30);
  }

  // OpenAI configuration
  get openaiApiKey(): string {
    const key = this.configService.get<string>('OPENAI_API_KEY');
    if (!key) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    return key;
  }

  get openaiModel(): string {
    return this.configService.get<string>('OPENAI_MODEL', 'gpt-4');
  }

  get openaiMaxTokens(): number {
    return this.configService.get<number>('OPENAI_MAX_TOKENS', 4000);
  }

  get openaiTemperature(): number {
    return this.configService.get<number>('OPENAI_TEMPERATURE', 0.1);
  }

  get openaiRateLimit(): number {
    return this.configService.get<number>('OPENAI_RATE_LIMIT', 10); // requests per minute
  }

  // Vector database configuration
  get vectorDbUrl(): string {
    return this.configService.get<string>('VECTOR_DB_URL', 'http://localhost:6333');
  }

  get vectorDbApiKey(): string {
    return this.configService.get<string>('VECTOR_DB_API_KEY', '');
  }

  get vectorDbCollection(): string {
    return this.configService.get<string>('VECTOR_DB_COLLECTION', 'zephix_documents');
  }

  // Processing configuration
  get maxConcurrentAnalyses(): number {
    return this.configService.get<number>('AI_MAX_CONCURRENT_ANALYSES', 5);
  }

  get analysisTimeoutMs(): number {
    return this.configService.get<number>('AI_ANALYSIS_TIMEOUT_MS', 300000); // 5 minutes
  }

  get enableProgressTracking(): boolean {
    return this.configService.get<boolean>('AI_ENABLE_PROGRESS_TRACKING', true);
  }

  // Security configuration
  get enableAuditLogging(): boolean {
    return this.configService.get<boolean>('AI_ENABLE_AUDIT_LOGGING', true);
  }

  get maxFileSizePerOrganization(): number {
    return this.configService.get<number>('AI_MAX_FILE_SIZE_PER_ORG', 100 * 1024 * 1024); // 100MB per org
  }

  get allowedOrganizations(): string[] {
    return this.configService.get<string[]>('AI_ALLOWED_ORGANIZATIONS', []); // Empty means all allowed
  }

  // Notification configuration
  get enableEmailNotifications(): boolean {
    return this.configService.get<boolean>('AI_ENABLE_EMAIL_NOTIFICATIONS', false);
  }

  get enableWebhookNotifications(): boolean {
    return this.configService.get<boolean>('AI_ENABLE_WEBHOOK_NOTIFICATIONS', false);
  }

  get webhookUrl(): string {
    return this.configService.get<string>('AI_WEBHOOK_URL', '');
  }

  // Validation methods
  validateConfiguration(): void {
    // Check required configurations
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key is required for AI functionality');
    }

    if (this.maxFileSize <= 0) {
      throw new Error('Max file size must be greater than 0');
    }

    if (this.openaiRateLimit <= 0) {
      throw new Error('OpenAI rate limit must be greater than 0');
    }

    if (this.analysisTimeoutMs <= 0) {
      throw new Error('Analysis timeout must be greater than 0');
    }
  }

  // Helper methods
  isOrganizationAllowed(organizationId: string): boolean {
    const allowed = this.allowedOrganizations;
    return allowed.length === 0 || allowed.includes(organizationId);
  }

  getFileSizeLimitForOrganization(organizationId: string): number {
    // Could implement tiered limits based on organization subscription
    return this.maxFileSizePerOrganization;
  }

  shouldEnableVirusScanning(): boolean {
    return this.virusScanningEnabled && process.env.NODE_ENV === 'production';
  }
}
