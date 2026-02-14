import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Default presigned PUT TTL: 15 minutes */
const PRESIGN_PUT_TTL_SECONDS = 900;
/** Default presigned GET TTL: 60 seconds (security) */
const PRESIGN_GET_TTL_SECONDS = 60;

/**
 * Phase 2G: S3-compatible Storage Abstraction
 *
 * Handles presigned URL generation and object deletion.
 * Server never streams file bytes.
 * Supports any S3-compatible endpoint (AWS, MinIO, R2, etc.).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('STORAGE_REGION') || 'us-east-1';
    const endpoint = this.configService.get<string>('STORAGE_ENDPOINT');
    const accessKeyId = this.configService.get<string>('STORAGE_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.configService.get<string>('STORAGE_SECRET_ACCESS_KEY') || '';
    this.bucket = this.configService.get<string>('STORAGE_BUCKET') || 'zephix-attachments';

    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log({
      context: 'STORAGE_INIT',
      region,
      bucket: this.bucket,
      hasEndpoint: !!endpoint,
    });
  }

  getBucket(): string {
    return this.bucket;
  }

  /**
   * Generate a presigned PUT URL for client-side upload.
   * Enforces Content-Type and Content-Length constraints.
   */
  async getPresignedPutUrl(
    storageKey: string,
    mimeType: string,
    sizeBytes: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGN_PUT_TTL_SECONDS,
    });

    // Never log the full URL — it contains credentials
    this.logger.log({
      context: 'PRESIGN_PUT',
      storageKey,
      mimeType,
      sizeBytes,
      expiresIn: PRESIGN_PUT_TTL_SECONDS,
    });

    return url;
  }

  /**
   * Generate a presigned GET URL for client-side download.
   * Short TTL (60s) for security.
   * Forces Content-Disposition: attachment with sanitized filename.
   */
  async getPresignedGetUrl(
    storageKey: string,
    fileName?: string,
  ): Promise<string> {
    const sanitized = fileName
      ? fileName.replace(/[^\w.\-]/g, '_').replace(/\.{2,}/g, '_')
      : 'download';

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ResponseContentDisposition: `attachment; filename="${sanitized}"`,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGN_GET_TTL_SECONDS,
    });

    this.logger.log({
      context: 'PRESIGN_GET',
      storageKey,
      expiresIn: PRESIGN_GET_TTL_SECONDS,
    });

    return url;
  }

  /**
   * Delete an object from storage. Best-effort — does not throw on failure.
   */
  async deleteObject(storageKey: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        }),
      );
      this.logger.log({ context: 'STORAGE_DELETE', storageKey });
    } catch (err: any) {
      this.logger.warn({
        context: 'STORAGE_DELETE_FAILED',
        storageKey,
        error: err.message,
      });
    }
  }
}
