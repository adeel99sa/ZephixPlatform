import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AIConfigService {
  readonly virusScanningEnabled: boolean;
  readonly maxFileSize: number;
  readonly allowedFileTypes: string[];
  readonly openaiModel: string;
  readonly maxCostPerAnalysis: number;
  readonly maxDailyCost: number;

  constructor(private readonly configService: ConfigService) {
    this.virusScanningEnabled = this.configService.get<boolean>('AI_VIRUS_SCANNING_ENABLED', true);
    this.maxFileSize = this.configService.get<number>('AI_MAX_FILE_SIZE', 25 * 1024 * 1024);
    this.allowedFileTypes = this.configService.get<string[]>('AI_ALLOWED_FILE_TYPES', ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', '.pdf', '.docx', '.doc', '.txt']);
    this.openaiModel = this.configService.get<string>('OPENAI_MODEL', 'gpt-4');
    this.maxCostPerAnalysis = this.configService.get<number>('AI_MAX_COST_PER_ANALYSIS', 20);
    this.maxDailyCost = this.configService.get<number>('AI_MAX_DAILY_COST', 100);
  }
}


