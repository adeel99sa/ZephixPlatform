/// <reference types="multer" />
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AIAnalysisService } from './ai-analysis.service';
import { AnalysisStatus, AnalysisType } from '../entities/ai-analysis.entity';

describe('AIAnalysisService', () => {
  let service: AIAnalysisService;
  let mockConfigService: any;
  let mockAiConfigService: any;
  let mockAnalysisRepo: any;
  let mockDocParser: any;
  let mockLlmProvider: any;
  let mockVectorDb: any;
  let mockEmbedding: any;
  let mockQueue: any;
  let mockAudit: any;
  let mockFileValidation: any;
  let mockVirusScan: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue: any) => defaultValue),
    };
    mockAiConfigService = {
      getConfig: jest.fn().mockReturnValue({ maxFileSizeMB: 50, allowedTypes: ['pdf', 'docx'] }),
    };
    mockAnalysisRepo = {
      findById: jest.fn(),
      create: jest.fn((data) => Promise.resolve({ id: 'analysis-1', ...data })),
      update: jest.fn(),
      findByOrganization: jest.fn(),
      getStats: jest.fn(),
      countActive: jest.fn().mockResolvedValue(0),
    };
    mockDocParser = {
      parse: jest.fn().mockResolvedValue({ text: 'parsed content', pages: 5 }),
    };
    mockLlmProvider = {
      analyze: jest.fn().mockResolvedValue({ result: 'analysis output', tokens: 500 }),
      isAvailable: jest.fn().mockReturnValue(true),
    };
    mockVectorDb = {
      store: jest.fn().mockResolvedValue(undefined),
    };
    mockEmbedding = {
      generate: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };
    mockQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };
    mockAudit = {
      logAccess: jest.fn(),
      record: jest.fn(),
    };
    mockFileValidation = {
      validate: jest.fn().mockResolvedValue({ valid: true }),
    };
    mockVirusScan = {
      scanFile: jest.fn().mockResolvedValue({ isClean: true, threats: [] }),
    };

    service = new AIAnalysisService(
      mockConfigService,
      mockAiConfigService,
      mockAnalysisRepo,
      mockDocParser,
      mockLlmProvider,
      mockVectorDb,
      mockEmbedding,
      mockQueue,
      mockAudit,
      mockFileValidation,
      mockVirusScan,
    );
  });

  describe('getAnalysisStatus', () => {
    it('returns status for pending analysis', async () => {
      const analysis = {
        id: 'analysis-1',
        status: AnalysisStatus.PENDING,
        getProgress: () => 0,
        getEstimatedCompletion: () => null,
        isCompleted: () => false,
        isFailed: () => false,
        metadata: {},
      };
      mockAnalysisRepo.findById.mockResolvedValue(analysis);

      const result = await service.getAnalysisStatus('analysis-1', 'org-1', 'user-1');

      expect(result.id).toBe('analysis-1');
      expect(result.status).toBe(AnalysisStatus.PENDING);
      expect(result.progress).toBe(0);
      expect(result.result).toBeUndefined();
      expect(mockAudit.logAccess).toHaveBeenCalledWith('ai_analysis_status', expect.any(Object));
    });

    it('returns result for completed analysis', async () => {
      const analysis = {
        id: 'analysis-1',
        status: AnalysisStatus.COMPLETED,
        getProgress: () => 100,
        getEstimatedCompletion: () => null,
        isCompleted: () => true,
        isFailed: () => false,
        analysisResult: { summary: 'test result' },
        metadata: {},
      };
      mockAnalysisRepo.findById.mockResolvedValue(analysis);

      const result = await service.getAnalysisStatus('analysis-1', 'org-1', 'user-1');

      expect(result.progress).toBe(100);
      expect(result.result).toEqual({ summary: 'test result' });
    });

    it('returns error for failed analysis', async () => {
      const analysis = {
        id: 'analysis-1',
        status: AnalysisStatus.FAILED,
        getProgress: () => 50,
        getEstimatedCompletion: () => null,
        isCompleted: () => false,
        isFailed: () => true,
        metadata: { errorDetails: { message: 'LLM rate limit exceeded' } },
      };
      mockAnalysisRepo.findById.mockResolvedValue(analysis);

      const result = await service.getAnalysisStatus('analysis-1', 'org-1', 'user-1');

      expect(result.error).toBe('LLM rate limit exceeded');
    });

    it('throws InternalServerErrorException on repo failure', async () => {
      mockAnalysisRepo.findById.mockRejectedValue(new Error('DB error'));

      await expect(
        service.getAnalysisStatus('analysis-1', 'org-1', 'user-1'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getAnalysisResult', () => {
    it('returns completed analysis', async () => {
      const analysis = {
        id: 'analysis-1',
        status: AnalysisStatus.COMPLETED,
        isCompleted: () => true,
      };
      mockAnalysisRepo.findById.mockResolvedValue(analysis);

      const result = await service.getAnalysisResult('analysis-1', 'org-1', 'user-1');
      expect(result).toEqual(analysis);
    });

    it('throws BadRequestException when analysis not completed', async () => {
      const analysis = {
        id: 'analysis-1',
        status: AnalysisStatus.PROCESSING,
        isCompleted: () => false,
      };
      mockAnalysisRepo.findById.mockResolvedValue(analysis);

      await expect(
        service.getAnalysisResult('analysis-1', 'org-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMockedFreePlan equivalent — safe fallbacks', () => {
    it('handles missing config gracefully via defaults', () => {
      // Verify constructor defaults are applied when config returns defaults
      expect(mockConfigService.get).toHaveBeenCalledWith('AI_MAX_CONCURRENT_ANALYSES', 10);
      expect(mockConfigService.get).toHaveBeenCalledWith('AI_ENABLE_ASYNC_PROCESSING', true);
      expect(mockConfigService.get).toHaveBeenCalledWith('AI_ENABLE_COST_TRACKING', true);
    });
  });
});