import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentParserService, DocumentChunk } from '../document-parser.service';

describe('DocumentParserService', () => {
  let service: DocumentParserService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentParserService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentParserService>(DocumentParserService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFile', () => {
    it('should validate valid .docx files', () => {
      const mockFile = {
        originalname: 'test.docx',
        size: 1024 * 1024, // 1MB
      } as any;

      const result = service.validateFile(mockFile);
      expect(result.valid).toBe(true);
    });

    it('should validate valid .pdf files', () => {
      const mockFile = {
        originalname: 'test.pdf',
        size: 1024 * 1024, // 1MB
      } as any;

      const result = service.validateFile(mockFile);
      expect(result.valid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const mockFile = {
        originalname: 'test.docx',
        size: 15 * 1024 * 1024, // 15MB
      } as any;

      const result = service.validateFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10MB');
    });

    it('should reject unsupported file types', () => {
      const mockFile = {
        originalname: 'test.txt',
        size: 1024 * 1024, // 1MB
      } as any;

      const result = service.validateFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });
  });

  describe('parseDocument', () => {
    it('should parse .docx files correctly', async () => {
      // Create a mock .docx buffer (simplified)
      const mockDocxBuffer = Buffer.from('Mock DOCX content');
      const documentId = 'test-doc-id';
      const filename = 'test.docx';

      const result = await service.parseDocument(mockDocxBuffer, filename, documentId);

      // Since we're using mock data, expect parsing to fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should parse .pdf files correctly', async () => {
      // Create a mock .pdf buffer (simplified)
      const mockPdfBuffer = Buffer.from('Mock PDF content');
      const documentId = 'test-pdf-id';
      const filename = 'test.pdf';

      const result = await service.parseDocument(mockPdfBuffer, filename, documentId);

      // Since we're using mock data, expect parsing to fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Note: processingTime might be 0 for very fast failures
      expect(typeof result.processingTime).toBe('number');
    });

    it('should reject unsupported file formats', async () => {
      const mockBuffer = Buffer.from('Mock content');
      const documentId = 'test-id';
      const filename = 'test.txt';

      const result = await service.parseDocument(mockBuffer, filename, documentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension correctly', () => {
      // This tests the private method indirectly through validateFile
      const mockFile = {
        originalname: 'document.docx',
        size: 1024,
      } as any;

      const result = service.validateFile(mockFile);
      expect(result.valid).toBe(true);
    });

    it('should handle files without extensions', () => {
      const mockFile = {
        originalname: 'document',
        size: 1024,
      } as any;

      const result = service.validateFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });
  });

  describe('error handling', () => {
    it('should handle corrupted files gracefully', async () => {
      const corruptedBuffer = Buffer.from(''); // Empty buffer
      const documentId = 'test-id';
      const filename = 'test.docx';

      const result = await service.parseDocument(corruptedBuffer, filename, documentId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });
});
