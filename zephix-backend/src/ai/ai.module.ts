import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentParserService } from './document-parser.service';
import { EmbeddingService } from './embedding.service';
import { VectorDatabaseService } from './vector-database.service';
import { DocumentUploadController } from './document-upload.controller';
import { ProjectGenerationController } from './project-generation.controller';
import { LLMProviderService } from './llm-provider.service';
import { ClaudeService } from './claude.service';
import { UserOrganization } from '../organizations/entities/user-organization.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([UserOrganization])],
  controllers: [DocumentUploadController, ProjectGenerationController],
  providers: [
    DocumentParserService,
    EmbeddingService,
    VectorDatabaseService,
    LLMProviderService,
    ClaudeService,
  ],
  exports: [
    DocumentParserService,
    EmbeddingService,
    VectorDatabaseService,
    LLMProviderService,
    ClaudeService,
  ],
})
export class AIModule {}
