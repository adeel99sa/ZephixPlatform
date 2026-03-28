import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TemplateDefinition } from './templates/entities/template-definition.entity';
import { TemplateVersion } from './templates/entities/template-version.entity';
import { TemplatePolicy } from './templates/entities/template-policy.entity';
import { TemplateComponent } from './templates/entities/template-component.entity';
import { KpiDefinitionEntity as KpiDefinition } from '../kpis/entities/kpi-definition.entity';
import { ProjectKpi } from './kpis/entities/project-kpi.entity';
import { KpiValue } from './kpis/entities/kpi-value.entity';
import { DocTemplate } from './documents/entities/doc-template.entity';
import { DocumentInstance } from './documents/entities/document-instance.entity';
import { DocumentVersion } from './documents/entities/document-version.entity';
import { GateApproval } from './gates/entities/gate-approval.entity';
import { TemplateLineage } from './apply/entities/template-lineage.entity';
import { AuditEvent } from '../work-management/entities/audit-event.entity';
import { Project } from '../projects/entities/project.entity';

import { TemplateDefinitionsService } from './templates/template-definitions.service';
import { TemplateDefinitionsController } from './templates/template-definitions.controller';
import { KpiLibraryService } from './kpis/kpi-library.service';
import { KpiLibraryController } from './kpis/kpi-library.controller';
import { ProjectKpisService } from './kpis/project-kpis.service';
import { ProjectKpisController } from './kpis/project-kpis.controller';
import { DocumentLibraryService } from './documents/document-library.service';
import { DocumentLibraryController } from './documents/document-library.controller';
import { DocumentLifecycleService } from './documents/document-lifecycle.service';
import { DocumentLifecycleController } from './documents/document-lifecycle.controller';
import { TemplateCenterSearchService } from './search/template-center-search.service';
import { TemplateCenterSearchController } from './search/template-center-search.controller';
import { TemplateApplyService } from './apply/template-apply.service';
import { TemplateApplyController } from './apply/template-apply.controller';
import { GateApprovalsService } from './gates/gate-approvals.service';
import { GateApprovalsController } from './gates/gate-approvals.controller';
import { TemplatePolicyResolverService } from './policies/template-policy-resolver.service';
import { TemplateCenterAuditService } from './audit/audit-events.service';
import { EvidencePackService } from './evidence/evidence-pack.service';
import { EvidencePackController } from './evidence/evidence-pack.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TemplateDefinition,
      TemplateVersion,
      TemplatePolicy,
      TemplateComponent,
      KpiDefinition,
      ProjectKpi,
      KpiValue,
      DocTemplate,
      DocumentInstance,
      DocumentVersion,
      GateApproval,
      TemplateLineage,
      AuditEvent,
      Project,
    ]),
  ],
  controllers: [
    TemplateDefinitionsController,
    KpiLibraryController,
    ProjectKpisController,
    DocumentLibraryController,
    DocumentLifecycleController,
    TemplateCenterSearchController,
    TemplateApplyController,
    GateApprovalsController,
    EvidencePackController,
  ],
  providers: [
    TemplateDefinitionsService,
    KpiLibraryService,
    ProjectKpisService,
    DocumentLibraryService,
    DocumentLifecycleService,
    TemplateCenterSearchService,
    TemplateApplyService,
    GateApprovalsService,
    TemplatePolicyResolverService,
    TemplateCenterAuditService,
    EvidencePackService,
  ],
  exports: [
    TemplateDefinitionsService,
    KpiLibraryService,
    ProjectKpisService,
    DocumentLibraryService,
    TemplateCenterSearchService,
    TemplateApplyService,
    GateApprovalsService,
    TemplatePolicyResolverService,
    TemplateCenterAuditService,
    EvidencePackService,
  ],
})
export class TemplateCenterModule {}
