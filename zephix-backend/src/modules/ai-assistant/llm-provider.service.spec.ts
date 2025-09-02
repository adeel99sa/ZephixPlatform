import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LLMProviderService } from './llm-provider.service';
import { MetricsService } from '../../observability/metrics.service';

describe('LLMProviderService', () => {
  let service: LLMProviderService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mock before each test
    jest.clearAllMocks();
    
    // Set default mock values - these will be used when the service is created
    mockConfigService.get.mockImplementation((key: string) => {
      const defaultConfig = {
        'anthropic.apiKey': 'test-api-key',
        'llm.provider': 'anthropic',
        'anthropic.model': 'claude-3-sonnet-20240229',
        'anthropic.dataRetentionOptOut': true,
        'anthropic.enableDataCollection': false,
        'llm.enforceNoDataRetention': true,
        'anthropic.apiVersion': '2023-06-01',
        'llm.validateOnStartup': false,
        'llm.logProviderSettings': false,
      };
      return defaultConfig[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMProviderService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MetricsService,
          useValue: {
            incrementCounter: jest.fn(),
            recordHistogram: jest.fn(),
            setGauge: jest.fn(),
            incrementLlmRequests: jest.fn(),
            observeLlmDuration: jest.fn(),
            incrementLlmTokens: jest.fn(),
            incrementError: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LLMProviderService>(LLMProviderService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load configuration on initialization', () => {
      expect(configService.get).toHaveBeenCalledWith('anthropic.apiKey');
      expect(configService.get).toHaveBeenCalledWith('llm.provider');
      expect(configService.get).toHaveBeenCalledWith('anthropic.model');
    });
  });

  describe('compliance validation', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          'anthropic.apiKey': 'test-api-key',
          'llm.provider': 'anthropic',
          'anthropic.model': 'claude-3-sonnet-20240229',
          'anthropic.dataRetentionOptOut': true,
          'anthropic.enableDataCollection': false,
          'llm.enforceNoDataRetention': true,
          'anthropic.apiVersion': '2023-06-01',
          'llm.validateOnStartup': false,
          'llm.logProviderSettings': false,
        };
        return config[key];
      });
    });

    it('should validate compliant configuration', () => {
      // Mock the config to return valid values
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          'anthropic.apiKey': 'test-api-key',
          'llm.provider': 'anthropic',
          'anthropic.model': 'claude-3-sonnet-20240229',
          'anthropic.dataRetentionOptOut': true,
          'anthropic.enableDataCollection': false,
          'llm.enforceNoDataRetention': true,
          'anthropic.apiVersion': '2023-06-01',
        };
        return config[key];
      });
      
      const compliance = service.getComplianceStatus();
      
      expect(compliance.isCompliant).toBe(true);
      expect(compliance.issues).toHaveLength(0);
    });

    it('should detect data retention opt-out issues', () => {
      // Create a new service instance with invalid config for this specific test
      const invalidMockConfig = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'anthropic.dataRetentionOptOut') return false;
          const config = {
            'anthropic.apiKey': 'test-api-key',
            'llm.provider': 'anthropic',
            'anthropic.model': 'claude-3-sonnet-20240229',
            'anthropic.enableDataCollection': false,
            'llm.enforceNoDataRetention': true,
            'anthropic.apiVersion': '2023-06-01',
          };
          return config[key];
        }),
      };

      const invalidService = new LLMProviderService(
        invalidMockConfig as any,
        {
          incrementCounter: jest.fn(),
          incrementLlmRequests: jest.fn(),
          observeLlmDuration: jest.fn(),
          incrementLlmTokens: jest.fn(),
          incrementError: jest.fn(),
        } as any
      );

      const compliance = invalidService.getComplianceStatus();
      
      expect(compliance.isCompliant).toBe(false);
      expect(compliance.issues).toContain('Data retention opt-out not enabled');
      expect(compliance.recommendations).toContain('Set ANTHROPIC_DATA_RETENTION_OPT_OUT=true');
    });

    it('should detect data collection enabled issues', () => {
      // Create a new service instance with invalid config for this specific test
      const invalidMockConfig = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'anthropic.enableDataCollection') return true;
          if (key === 'anthropic.dataRetentionOptOut') return true;
          const config = {
            'anthropic.apiKey': 'test-api-key',
            'llm.provider': 'anthropic',
            'anthropic.model': 'claude-3-sonnet-20240229',
            'llm.enforceNoDataRetention': true,
            'anthropic.apiVersion': '2023-06-01',
          };
          return config[key];
        }),
      };

      const invalidService = new LLMProviderService(
        invalidMockConfig as any,
        {
          incrementCounter: jest.fn(),
          incrementLlmRequests: jest.fn(),
          observeLlmDuration: jest.fn(),
          incrementLlmTokens: jest.fn(),
          incrementError: jest.fn(),
        } as any
      );

      const compliance = invalidService.getComplianceStatus();
      
      expect(compliance.isCompliant).toBe(false);
      expect(compliance.issues).toContain('Data collection is enabled');
      expect(compliance.recommendations).toContain('Set ANTHROPIC_ENABLE_DATA_COLLECTION=false or remove the variable');
    });
  });

  describe('configuration checks', () => {
    it('should detect missing API key', () => {
      // Create a new service instance with missing API key for this specific test
      const invalidMockConfig = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'anthropic.apiKey') return '';
          const config = {
            'llm.provider': 'anthropic',
            'anthropic.model': 'claude-3-sonnet-20240229',
            'anthropic.dataRetentionOptOut': true,
            'anthropic.enableDataCollection': false,
            'llm.enforceNoDataRetention': true,
            'anthropic.apiVersion': '2023-06-01',
          };
          return config[key];
        }),
      };

      const invalidService = new LLMProviderService(
        invalidMockConfig as any,
        {
          incrementCounter: jest.fn(),
          incrementLlmRequests: jest.fn(),
          observeLlmDuration: jest.fn(),
          incrementLlmTokens: jest.fn(),
          incrementError: jest.fn(),
        } as any
      );

      expect(invalidService.isConfigured()).toBe(false);
    });

    it('should confirm proper configuration', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          'anthropic.apiKey': 'test-api-key',
          'llm.provider': 'anthropic',
          'anthropic.model': 'claude-3-sonnet-20240229',
          'anthropic.dataRetentionOptOut': true,
          'anthropic.enableDataCollection': false,
          'llm.enforceNoDataRetention': true,
          'anthropic.apiVersion': '2023-06-01',
        };
        return config[key];
      });

      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('provider settings', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          'anthropic.apiKey': 'test-api-key',
          'llm.provider': 'anthropic',
          'anthropic.model': 'claude-3-sonnet-20240229',
          'anthropic.dataRetentionOptOut': true,
          'anthropic.enableDataCollection': false,
          'llm.enforceNoDataRetention': true,
          'anthropic.apiVersion': '2023-06-01',
        };
        return config[key];
      });
    });

    it('should return provider settings', () => {
      const settings = service.getProviderSettings();
      
      expect(settings.provider).toBe('anthropic');
      expect(settings.model).toBe('claude-3-sonnet-20240229');
      expect(settings.dataRetentionOptOut).toBe(true);
      expect(settings.enableDataCollection).toBe(false);
      expect(settings.enforceNoDataRetention).toBe(true);
      expect(settings.apiVersion).toBe('2023-06-01');
    });

    it('should not expose sensitive data', () => {
      const settings = service.getProviderSettings();
      
      expect(settings).not.toHaveProperty('apiKey');
      expect(settings).not.toHaveProperty('anthropicApiKey');
    });
  });

  describe('LLM requests', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          'anthropic.apiKey': 'test-api-key',
          'llm.provider': 'anthropic',
          'anthropic.model': 'claude-3-sonnet-20240229',
          'anthropic.maxTokens': 4000,
          'anthropic.dataRetentionOptOut': true,
          'anthropic.enableDataCollection': false,
          'llm.enforceNoDataRetention': true,
          'anthropic.apiVersion': '2023-06-01',
        };
        return config[key];
      });
    });

    it('should return error response when not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'anthropic.apiKey') return '';
        return null;
      });

      const request = {
        prompt: 'Test prompt',
      };

      const response = await service.sendRequest(request);
      
      expect(response.content).toContain('AI service temporarily unavailable');
      expect(response.finishReason).toBe('error');
    });

    it('should format request properly', async () => {
      // Mock fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: '{"result": "test"}' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          model: 'claude-3-sonnet-20240229',
          stop_reason: 'end_turn'
        })
      });
      global.fetch = mockFetch;

      const request = {
        prompt: 'Test prompt',
        systemPrompt: 'Test system prompt',
        maxTokens: 2000,
        temperature: 0.7
      };

      const response = await service.sendRequest(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01',
          }),
          body: expect.stringContaining('"model":"claude-3-sonnet-20240229"'),
        })
      );

      expect(response.content).toBe('{"result": "test"}');
      expect(response.usage.totalTokens).toBe(30);
    });
  });
});
