import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationService {
  validateFile(file: any): void {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 25MB limit');
    }
  }
}
