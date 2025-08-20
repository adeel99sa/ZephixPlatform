import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentParserService } from '../document-parser.service';

// ✅ SENIOR-LEVEL TEST IMPLEMENTATION
describe('DocumentParserService', () => {
  let service: DocumentParserService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentParserService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DocumentParserService>(DocumentParserService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseDocument', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should parse PDF documents', async () => {
      const mockFile = Buffer.from('mock pdf content');
      const filename = 'test.pdf';

      const result = await service.parseDocument(mockFile, filename);

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.content).toBeDefined();
    });

    it('should parse TXT documents', async () => {
      const mockFile = Buffer.from('mock text content');
      const filename = 'test.txt';

      const result = await service.parseDocument(mockFile, filename);

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.content).toBeDefined();
    });

    it('should handle unsupported file types', async () => {
      const mockFile = Buffer.from('mock content');
      const filename = 'test.xyz';

      await expect(service.parseDocument(mockFile, filename)).rejects.toThrow();
    });
  });

  describe('parseTxt', () => {
    it('should parse text content correctly', () => {
      const content = 'This is a test\nwith multiple lines';

      const result = service.parseTxt(content);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
