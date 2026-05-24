import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectArtifact } from './entities/project-artifact.entity';
import { ProjectArtifactItem } from './entities/project-artifact-item.entity';
import { Project } from '../projects/entities/project.entity';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import { AuditModule } from '../audit/audit.module';

import { ProjectArtifactsService } from './services/project-artifacts.service';
import { ProjectArtifactItemsService } from './services/project-artifact-items.service';
import { ProjectArtifactsController } from './controllers/project-artifacts.controller';

/**
 * Sprint 5.1 — Path B Beta artifact foundation.
 *
 * Wires the two new entities with TenantAwareRepository providers (matching
 * the work-management module pattern), imports WorkspaceAccessModule for
 * per-project workspace-membership checks, and pulls AuditModule so the
 * services can record E9 audit events via the global AuditService.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectArtifact, ProjectArtifactItem, Project]),
    TenancyModule,
    WorkspaceAccessModule,
    AuditModule,
  ],
  controllers: [ProjectArtifactsController],
  providers: [
    ProjectArtifactsService,
    ProjectArtifactItemsService,
    createTenantAwareRepositoryProvider(ProjectArtifact),
    createTenantAwareRepositoryProvider(ProjectArtifactItem),
  ],
  exports: [ProjectArtifactsService, ProjectArtifactItemsService],
})
export class ProjectArtifactsModule {}
