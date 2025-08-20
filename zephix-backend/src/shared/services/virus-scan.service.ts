import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export interface VirusScanResult {
  isClean: boolean;
  threats: string[];
  scanMethod: 'clamav' | 'signature' | 'none';
  scanTime: number;
  fileSize: number;
  fileHash: string;
  error?: string;
}

export interface FileSignature {
  magic: string;
  extension: string;
  mimeType: string;
  description: string;
}

@Injectable()
export class VirusScanService {
  private readonly logger = new Logger(VirusScanService.name);
  private readonly enableVirusScanning: boolean;
  private readonly clamavPath: string;
  private readonly maxFileSize: number;
  private readonly allowedFileTypes: string[];
  private readonly fileSignatures: Map<string, FileSignature>;

  constructor(private readonly configService: ConfigService) {
    this.enableVirusScanning = this.configService.get<boolean>(
      'SECURITY_VIRUS_SCAN_ENABLED',
      true,
    );
    this.clamavPath = this.configService.get<string>(
      'CLAMAV_PATH',
      '/usr/bin/clamscan',
    );
    this.maxFileSize = this.configService.get<number>(
      'SECURITY_MAX_FILE_SIZE',
      100 * 1024 * 1024,
    ); // 100MB
    this.allowedFileTypes = this.configService.get<string[]>(
      'SECURITY_ALLOWED_FILE_TYPES',
      ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls', '.pptx', '.ppt'],
    );

    this.fileSignatures = this.initializeFileSignatures();
  }

  /**
   * Scan a file for viruses using multiple methods
   */
  async scanFile(file: Buffer, filename: string): Promise<VirusScanResult> {
    const startTime = Date.now();
    const fileSize = file.length;
    const fileHash = this.calculateFileHash(file);

    this.logger.log(
      `Starting virus scan for file: ${filename} (${fileSize} bytes)`,
    );

    // Basic file size validation
    if (fileSize > this.maxFileSize) {
      return {
        isClean: false,
        threats: [
          `File size ${fileSize} bytes exceeds maximum allowed size ${this.maxFileSize} bytes`,
        ],
        scanMethod: 'none',
        scanTime: Date.now() - startTime,
        fileSize,
        fileHash,
        error: 'File too large for scanning',
      };
    }

    // File type validation
    const fileExtension = path.extname(filename).toLowerCase();
    if (!this.allowedFileTypes.includes(fileExtension)) {
      return {
        isClean: false,
        threats: [`File type ${fileExtension} is not allowed`],
        scanMethod: 'none',
        scanTime: Date.now() - startTime,
        fileSize,
        fileHash,
        error: 'File type not allowed',
      };
    }

    // Try ClamAV first (most reliable)
    if (this.enableVirusScanning && (await this.isClamAVAvailable())) {
      try {
        const clamavResult = await this.scanWithClamAV(file, filename);
        return {
          ...clamavResult,
          scanTime: Date.now() - startTime,
          fileSize,
          fileHash,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        this.logger.warn(
          `ClamAV scan failed, falling back to signature analysis: ${errorMessage}`,
        );
        // Fall back to signature analysis
      }
    }

    // Fallback to signature analysis
    try {
      const signatureResult = await this.scanWithFileSignatures(file, filename);
      return {
        ...signatureResult,
        scanTime: Date.now() - startTime,
        fileSize,
        fileHash,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Signature analysis failed: ${errorMessage}`, error);
      return {
        isClean: false,
        threats: ['Unable to perform security scan'],
        scanMethod: 'none',
        scanTime: Date.now() - startTime,
        fileSize,
        fileHash,
        error: 'Scan failed',
      };
    }
  }

  /**
   * Scan file using ClamAV antivirus
   */
  private async scanWithClamAV(
    file: Buffer,
    filename: string,
  ): Promise<Omit<VirusScanResult, 'scanTime' | 'fileSize' | 'fileHash'>> {
    return new Promise((resolve, reject) => {
      // Write file to temporary location for ClamAV
      const tempDir = this.configService.get<string>('TEMP_DIR', '/tmp');
      const tempFile = path.join(tempDir, `scan_${Date.now()}_${filename}`);

      fs.writeFileSync(tempFile, file);

      const clamscan = spawn(this.clamavPath, [
        '--no-summary',
        '--infected',
        '--suppress-ok-results',
        tempFile,
      ]);

      let stdout = '';
      let stderr = '';

      clamscan.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      clamscan.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      clamscan.on('close', (code) => {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFile);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          this.logger.warn(
            `Failed to clean up temporary file ${tempFile}: ${errorMessage}`,
          );
        }

        if (code === 0) {
          // No threats found
          resolve({
            isClean: true,
            threats: [],
            scanMethod: 'clamav',
          });
        } else if (code === 1) {
          // Threats found
          const threats = stdout
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => line.replace(tempFile + ': ', ''));

          resolve({
            isClean: false,
            threats,
            scanMethod: 'clamav',
          });
        } else {
          // Error occurred
          reject(new Error(`ClamAV scan failed with code ${code}: ${stderr}`));
        }
      });

      clamscan.on('error', (error) => {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        reject(new Error(`ClamAV execution failed: ${errorMessage}`));
      });
    });
  }

  /**
   * Scan file using file signature analysis
   */
  private async scanWithFileSignatures(
    file: Buffer,
    filename: string,
  ): Promise<Omit<VirusScanResult, 'scanTime' | 'fileSize' | 'fileHash'>> {
    const fileExtension = path.extname(filename).toLowerCase();
    const magicBytes = file.slice(0, 16).toString('hex').toUpperCase();

    // Check if file signature matches expected type
    const expectedSignature = this.fileSignatures.get(fileExtension);
    if (expectedSignature) {
      if (!magicBytes.startsWith(expectedSignature.magic)) {
        return {
          isClean: false,
          threats: [
            `File signature mismatch: expected ${expectedSignature.magic}, got ${magicBytes.substring(0, expectedSignature.magic.length)}`,
          ],
          scanMethod: 'signature',
        };
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(file);
    if (suspiciousPatterns.length > 0) {
      return {
        isClean: false,
        threats: suspiciousPatterns,
        scanMethod: 'signature',
      };
    }

    return {
      isClean: true,
      threats: [],
      scanMethod: 'signature',
    };
  }

  /**
   * Detect suspicious patterns in file content
   */
  private detectSuspiciousPatterns(file: Buffer): string[] {
    const threats: string[] = [];
    const content = file.toString('utf8', 0, Math.min(file.length, 10000)); // Check first 10KB

    // Check for executable patterns
    if (content.includes('MZ') || content.includes('#!/')) {
      threats.push('File contains executable patterns');
    }

    // Check for script patterns
    if (content.includes('<script') || content.includes('javascript:')) {
      threats.push('File contains script patterns');
    }

    // Check for suspicious URLs
    const urlPattern = /https?:\/\/[^\s<>"]+/gi;
    const urls = content.match(urlPattern);
    if (urls) {
      const suspiciousUrls = urls.filter(
        (url) =>
          url.includes('malware') ||
          url.includes('virus') ||
          url.includes('hack') ||
          url.includes('exploit'),
      );
      if (suspiciousUrls.length > 0) {
        threats.push(
          `File contains suspicious URLs: ${suspiciousUrls.join(', ')}`,
        );
      }
    }

    return threats;
  }

  /**
   * Check if ClamAV is available on the system
   */
  private async isClamAVAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const clamscan = spawn(this.clamavPath, ['--version']);

      clamscan.on('close', (code) => {
        resolve(code === 0);
      });

      clamscan.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Calculate SHA-256 hash of file
   */
  private calculateFileHash(file: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(file).digest('hex');
  }

  /**
   * Initialize file signature database
   */
  private initializeFileSignatures(): Map<string, FileSignature> {
    const signatures = new Map<string, FileSignature>();

    // PDF files
    signatures.set('.pdf', {
      magic: '25504446',
      extension: '.pdf',
      mimeType: 'application/pdf',
      description: 'PDF Document',
    });

    // DOCX files (ZIP-based)
    signatures.set('.docx', {
      magic: '504B0304',
      extension: '.docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      description: 'Microsoft Word Document',
    });

    // DOC files
    signatures.set('.doc', {
      magic: 'D0CF11E0',
      extension: '.doc',
      mimeType: 'application/msword',
      description: 'Microsoft Word Document',
    });

    // TXT files
    signatures.set('.txt', {
      magic: '', // Text files don't have magic bytes
      extension: '.txt',
      mimeType: 'text/plain',
      description: 'Text Document',
    });

    // XLSX files (ZIP-based)
    signatures.set('.xlsx', {
      magic: '504B0304',
      extension: '.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      description: 'Microsoft Excel Spreadsheet',
    });

    // PPTX files (ZIP-based)
    signatures.set('.pptx', {
      magic: '504B0304',
      extension: '.pptx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      description: 'Microsoft PowerPoint Presentation',
    });

    return signatures;
  }

  /**
   * Get service status and configuration
   */
  getStatus(): {
    enabled: boolean;
    clamavAvailable: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
  } {
    return {
      enabled: this.enableVirusScanning,
      clamavAvailable: false, // Will be updated on first scan
      maxFileSize: this.maxFileSize,
      allowedFileTypes: this.allowedFileTypes,
    };
  }
}
