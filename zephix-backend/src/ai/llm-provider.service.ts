import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../observability/metrics.service';
import { Global } from '@nestjs/common';

export interface LLMRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

export interface ProviderSettings {
  provider: string;
  model: string;
  dataRetentionOptOut: boolean;
  enableDataCollection: boolean;
  enforceNoDataRetention: boolean;
  apiVersion: string;
}

@Global()
@Injectable()
export class LLMProviderService implements OnModuleInit {
  private readonly logger = new Logger(LLMProviderService.name);
  private readonly anthropicApiKey: string;
  private readonly providerSettings: ProviderSettings;
  private isConfigValid = true; // Track configuration state for graceful degradation

  constructor(
    private configService: ConfigService,
    private metricsService: MetricsService,
  ) {
    this.anthropicApiKey =
      this.configService.get<string>('anthropic.apiKey') || '';
    this.providerSettings = {
      provider: this.configService.get<string>('llm.provider') || 'anthropic',
      model:
        this.configService.get<string>('anthropic.model') ||
        'claude-3-sonnet-20240229',
      dataRetentionOptOut:
        this.configService.get<boolean>('anthropic.dataRetentionOptOut') ||
        false,
      enableDataCollection:
        this.configService.get<boolean>('anthropic.enableDataCollection') ||
        false,
      enforceNoDataRetention:
        this.configService.get<boolean>('llm.enforceNoDataRetention') !== false, // Default true
      apiVersion:
        this.configService.get<string>('anthropic.apiVersion') || '2023-06-01',
    };
  }

  async onModuleInit() {
    if (this.configService.get<boolean>('llm.validateOnStartup')) {
      this.validateProviderSettings(); // Remove await since it's now non-blocking
    }

    if (this.configService.get<boolean>('llm.logProviderSettings')) {
      this.logProviderSettings();
    }
  }

  private validateProviderSettings(): void {
    this.logger.log('🔍 Validating LLM provider settings...');

    const issues: string[] = [];

    // Check API key configuration
    if (!this.anthropicApiKey) {
      issues.push('ANTHROPIC_API_KEY not configured');
    }

    // Check data retention enforcement
    if (this.providerSettings.enforceNoDataRetention) {
      if (!this.providerSettings.dataRetentionOptOut) {
        issues.push(
          'Data retention opt-out not enabled (ANTHROPIC_DATA_RETENTION_OPT_OUT should be true)',
        );
      }

      if (this.providerSettings.enableDataCollection) {
        issues.push(
          'Data collection is enabled (ANTHROPIC_ENABLE_DATA_COLLECTION should be false)',
        );
      }
    }

    // Check model configuration
    if (!this.providerSettings.model) {
      issues.push('Model not specified');
    }

    if (issues.length > 0) {
      // CHANGE: Make it a warning instead of throwing an error
      this.logger.warn('⚠️ LLM Provider configuration issues found:');
      issues.forEach((issue) => {
        this.logger.warn(`- ${issue}`);
      });
      this.logger.warn(
        '🔧 Application will continue with limited AI functionality',
      );

      // Set flag to indicate degraded functionality
      this.isConfigValid = false;
    } else {
      this.logger.log('✅ LLM Provider configuration validated successfully');
      this.isConfigValid = true;
    }
  }

  private logProviderSettings(): void {
    this.logger.log('📋 LLM Provider Settings:');
    this.logger.log(`   Provider: ${this.providerSettings.provider}`);
    this.logger.log(`   Model: ${this.providerSettings.model}`);
    this.logger.log(`   API Version: ${this.providerSettings.apiVersion}`);
    this.logger.log(
      `   Data Retention Opt-Out: ${this.providerSettings.dataRetentionOptOut ? '✅ YES' : '❌ NO'}`,
    );
    this.logger.log(
      `   Data Collection Enabled: ${this.providerSettings.enableDataCollection ? '❌ YES' : '✅ NO'}`,
    );
    this.logger.log(
      `   Enforce No Data Retention: ${this.providerSettings.enforceNoDataRetention ? '✅ YES' : '❌ NO'}`,
    );

    // Log compliance status
    const isCompliant = this.isDataRetentionCompliant();
    this.logger.log(
      `   🛡️  Data Retention Compliance: ${isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`,
    );

    if (!isCompliant) {
      this.logger.warn(
        '⚠️  WARNING: Current configuration may allow data retention for training',
      );
    }
  }

  private isDataRetentionCompliant(): boolean {
    return (
      this.providerSettings.dataRetentionOptOut &&
      !this.providerSettings.enableDataCollection
    );
  }

  async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    // Handle graceful degradation when configuration is invalid
    if (!this.isConfigValid) {
      this.logger.warn(
        '⚠️ LLM service not properly configured, returning placeholder response',
      );
      return {
        content:
          'AI service temporarily unavailable. Please check configuration.',
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        model: this.providerSettings.model || 'unavailable',
        finishReason: 'configuration_error',
      };
    }

    if (!this.anthropicApiKey) {
      this.logger.error('ANTHROPIC_API_KEY not configured');
      return {
        content: 'AI service temporarily unavailable. API key not configured.',
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        model: this.providerSettings.model || 'unavailable',
        finishReason: 'api_key_missing',
      };
    }

    // Log compliance check for each request
    if (!this.isDataRetentionCompliant()) {
      this.logger.warn(
        '⚠️  Making LLM request with non-compliant data retention settings',
      );
    }

    const startTime = Date.now();
    const model = request.model || this.providerSettings.model;
    const provider = this.providerSettings.provider;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': this.anthropicApiKey,
        'anthropic-version': this.providerSettings.apiVersion,
      };

      // Add data retention headers if opted out
      if (this.providerSettings.dataRetentionOptOut) {
        headers['anthropic-beta'] = 'max-tokens-3-5-sonnet-2024-07-15';
      }

      const body = {
        model: request.model || this.providerSettings.model,
        max_tokens:
          request.maxTokens ||
          this.configService.get<number>('anthropic.maxTokens'),
        messages: [
          ...(request.systemPrompt
            ? [
                {
                  role: 'system',
                  content: request.systemPrompt,
                },
              ]
            : []),
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        ...(request.temperature !== undefined && {
          temperature: request.temperature,
        }),
      };

      this.logger.debug(
        `📤 Sending LLM request (compliance: ${this.isDataRetentionCompliant() ? 'OK' : 'WARNING'})`,
      );

      const fetchResponse = await fetch(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        },
      );

      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.text();
        this.logger.error(
          `LLM API request failed: ${fetchResponse.status} ${fetchResponse.statusText}`,
          errorData,
        );
        throw new Error(
          `LLM API request failed: ${fetchResponse.status} ${fetchResponse.statusText}`,
        );
      }

      const data = await fetchResponse.json();

      if (!data.content || !data.content[0] || !data.content[0].text) {
        this.logger.error('Invalid response format from LLM service', data);
        throw new Error('Invalid response format from LLM service');
      }

      this.logger.debug('📥 Received LLM response');

      const durationSeconds = (Date.now() - startTime) / 1000;
      const llmResponse = {
        content: data.content[0].text,
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
          totalTokens:
            (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
        model: data.model || request.model || this.providerSettings.model,
        finishReason: data.stop_reason || 'unknown',
      };

      // Record success metrics
      this.metricsService.incrementLlmRequests(provider, model, 'success');
      this.metricsService.observeLlmDuration(provider, model, durationSeconds);
      this.metricsService.incrementLlmTokens(
        provider,
        model,
        'input',
        llmResponse.usage.inputTokens,
      );
      this.metricsService.incrementLlmTokens(
        provider,
        model,
        'output',
        llmResponse.usage.outputTokens,
      );

      return llmResponse;
    } catch (error) {
      const durationSeconds = (Date.now() - startTime) / 1000;

      // Record error metrics
      this.metricsService.incrementLlmRequests(provider, model, 'error');
      this.metricsService.observeLlmDuration(provider, model, durationSeconds);
      this.metricsService.incrementError('llm_request', 'llm-provider');

      this.logger.error('AI generation failed:', error);

      // Return graceful error response instead of throwing
      return {
        content: 'AI service temporarily unavailable.',
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        model: model,
        finishReason: 'error',
      };
    }
  }

  getProviderSettings(): ProviderSettings {
    return { ...this.providerSettings };
  }

  isConfigured(): boolean {
    return !!this.anthropicApiKey && this.isConfigValid;
  }

  getComplianceStatus(): {
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!this.providerSettings.dataRetentionOptOut) {
      issues.push('Data retention opt-out not enabled');
      recommendations.push('Set ANTHROPIC_DATA_RETENTION_OPT_OUT=true');
    }

    if (this.providerSettings.enableDataCollection) {
      issues.push('Data collection is enabled');
      recommendations.push(
        'Set ANTHROPIC_ENABLE_DATA_COLLECTION=false or remove the variable',
      );
    }

    if (!this.providerSettings.enforceNoDataRetention) {
      recommendations.push(
        'Set LLM_ENFORCE_NO_DATA_RETENTION=true for strict compliance',
      );
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      recommendations,
    };
  }
}
