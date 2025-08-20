import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LLMProviderService } from './llm-provider.service';

// ✅ SENIOR-LEVEL TEST IMPLEMENTATION
describe('LLMProviderService', () => {
  let service: LLMProviderService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        OPENAI_API_KEY: 'test-api-key',
        LLM_MODEL: 'gpt-3.5-turbo',
        LLM_MAX_TOKENS: 1000,
        LLM_TEMPERATURE: 0.7,
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
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
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with proper configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('OPENAI_API_KEY');
      expect(configService.get).toHaveBeenCalledWith(
        'LLM_MODEL',
        'gpt-3.5-turbo',
      );
    });
  });

  describe('generateCompletion', () => {
    it('should generate completion for valid prompt', async () => {
      const prompt = 'Test prompt';

      // Mock the actual LLM call
      jest.spyOn(service as any, 'callLLMAPI').mockResolvedValue({
        content: 'Test response',
        usage: { tokens: 50 },
      });

      const result = await service.generateCompletion(prompt);

      expect(result).toBeDefined();
      expect(result.content).toBe('Test response');
    });

    it('should handle empty prompt gracefully', async () => {
      await expect(service.generateCompletion('')).rejects.toThrow();
    });
  });

  describe('analyzeDocument', () => {
    it('should analyze document content', async () => {
      const documentText = 'This is a sample document for analysis';

      jest.spyOn(service as any, 'callLLMAPI').mockResolvedValue({
        content: JSON.stringify({
          summary: 'Document summary',
          key_points: ['Point 1', 'Point 2'],
          recommendations: ['Recommendation 1'],
        }),
        usage: { tokens: 100 },
      });

      const result = await service.analyzeDocument(documentText);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.key_points).toBeDefined();
      expect(Array.isArray(result.key_points)).toBe(true);
    });
  });
});
