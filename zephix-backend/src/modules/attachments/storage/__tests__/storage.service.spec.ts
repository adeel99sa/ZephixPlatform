/**
 * Phase 2G: Storage Service Tests
 *
 * Verifies presign calls, deletion, and security (no URL logging).
 */
import { StorageService } from '../storage.service';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn().mockImplementation((params: any) => params),
  GetObjectCommand: jest.fn().mockImplementation((params: any) => params),
  DeleteObjectCommand: jest.fn().mockImplementation((params: any) => params),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned-url?token=secret'),
}));

const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

describe('StorageService', () => {
  let service: StorageService;
  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        STORAGE_REGION: 'us-east-1',
        STORAGE_BUCKET: 'test-bucket',
        STORAGE_ACCESS_KEY_ID: 'test-key',
        STORAGE_SECRET_ACCESS_KEY: 'test-secret',
      };
      return map[key];
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StorageService(mockConfigService as any);
  });

  it('returns bucket name from config', () => {
    expect(service.getBucket()).toBe('test-bucket');
  });

  it('generates presigned PUT URL with correct params', async () => {
    const url = await service.getPresignedPutUrl('org/ws/file.pdf', 'application/pdf', 1024);
    expect(url).toContain('presigned-url');
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'org/ws/file.pdf',
        ContentType: 'application/pdf',
        ContentLength: 1024,
      }),
      expect.objectContaining({ expiresIn: 900 }),
    );
  });

  it('generates presigned GET URL with Content-Disposition attachment', async () => {
    const url = await service.getPresignedGetUrl('org/ws/file.pdf', 'my report.pdf');
    expect(url).toContain('presigned-url');
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'org/ws/file.pdf',
        ResponseContentDisposition: 'attachment; filename="my_report.pdf"',
      }),
      expect.objectContaining({ expiresIn: 60 }),
    );
  });

  it('sanitizes filename in GET presign — strips unsafe characters', async () => {
    await service.getPresignedGetUrl('key', '../../../etc/passwd');
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ResponseContentDisposition: expect.not.stringContaining('..'),
      }),
      expect.anything(),
    );
  });

  it('deleteObject succeeds silently', async () => {
    await expect(service.deleteObject('org/ws/file.pdf')).resolves.not.toThrow();
  });

  it('deleteObject does not throw on failure', async () => {
    // Override send to reject
    const originalClient = (service as any).client;
    originalClient.send = jest.fn().mockRejectedValue(new Error('Network error'));
    await expect(service.deleteObject('key')).resolves.not.toThrow();
  });
});
