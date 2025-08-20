import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentParserService } from './document-parser.service';
import { EmbeddingService } from './embedding.service';
import { VectorDatabaseService } from './vector-database.service';
import { DocumentUploadController } from './document-upload.controller';
import { ProjectGenerationController } from './project-generation.controller';
import { AIMappingController } from './ai-mapping.controller';
import { AISuggestionsController } from './ai-suggestions.controller';

import { AIMappingService } from './services/ai-mapping.service';
import { AISuggestionsService } from './services/ai-suggestions.service';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    // Only import TypeORM when database is available
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [TypeOrmModule.forFeature([UserOrganization])]
      : []),
  ],
  controllers: [
    DocumentUploadController,
    ProjectGenerationController,
    AIMappingController,
    AISuggestionsController,
  ],
  providers: [
    DocumentParserService,
    EmbeddingService,
    VectorDatabaseService,
    AIMappingService,
    AISuggestionsService,
  ],
  exports: [
    DocumentParserService,
    EmbeddingService,
    VectorDatabaseService,
    AIMappingService,
    AISuggestionsService,
  ],
})
export class AIModule {}
