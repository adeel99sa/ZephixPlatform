import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './entities/document.entity';
import { DocumentsService } from './services/documents.service';
import { DocumentsController } from './controllers/documents.controller';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    TenancyModule, // TenantAwareRepository + TenantContextService
    WorkspaceAccessModule, // WorkspaceRoleGuardService (membership checks)
  ],
  providers: [
    // DOC-TENANT-1: documents are read/written through the tenant-aware repo
    // so org (and workspace) scoping is enforced at the data layer.
    createTenantAwareRepositoryProvider(DocumentEntity),
    DocumentsService,
  ],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
