import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LLMProviderService } from './llm-provider.service';

describe('LLMProviderService', () => {
  let service: LLMProviderService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mock before each test
    jest.clearAllMocks();
    
    // Set default mock values
    mockConfigService.get.mockImplementation((key: string) => {
      const defaultConfig = {
        'anthropic.apiKey': '',
        'llm.provider': 'anthropic',
        'anthropic.model': 'claude-3-sonnet-20240229',
        'anthropic.dataRetentionOptOut': false,
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
      const compliance = service.getComplianceStatus();
      
      expect(compliance.isCompliant).toBe(true);
      expect(compliance.issues).toHaveLength(0);
    });

    it('should detect data retention opt-out issues', () => {
      mockConfigService.get.mockImplementation((key: string) => {
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
      });

      const compliance = service.getComplianceStatus();
      
      expect(compliance.isCompliant).toBe(false);
      expect(compliance.issues).toContain('Data retention opt-out not enabled');
      expect(compliance.recommendations).toContain('Set ANTHROPIC_DATA_RETENTION_OPT_OUT=true');
    });

    it('should detect data collection enabled issues', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'anthropic.enableDataCollection') return true;
        const config = {
          'anthropic.apiKey': 'test-api-key',
          'llm.provider': 'anthropic',
          'anthropic.model': 'claude-3-sonnet-20240229',
          'anthropic.dataRetentionOptOut': true,
          'llm.enforceNoDataRetention': true,
          'anthropic.apiVersion': '2023-06-01',
        };
        return config[key];
      });

      const compliance = service.getComplianceStatus();
      
      expect(compliance.isCompliant).toBe(false);
      expect(compliance.issues).toContain('Data collection is enabled');
      expect(compliance.recommendations).toContain('Set ANTHROPIC_ENABLE_DATA_COLLECTION=false or remove the variable');
    });
  });

  describe('configuration checks', () => {
    it('should detect missing API key', () => {
      mockConfigService.get.mockImplementation((key: string) => {
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
      });

      expect(service.isConfigured()).toBe(false);
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

    it('should throw error when not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'anthropic.apiKey') return '';
        return null;
      });

      const request = {
        prompt: 'Test prompt',
      };

      await expect(service.sendRequest(request)).rejects.toThrow('LLM provider not configured');
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
