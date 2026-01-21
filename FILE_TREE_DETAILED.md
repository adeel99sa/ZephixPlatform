# Zephix Platform - Detailed File Tree

## Backend Source Tree (src/)

```
zephix-backend/src/
├── admin
│   ├── dto
│   │   ├── admin-response.dto.ts
│   │   ├── admin-stats.dto.ts
│   │   ├── create-audit-log.dto.ts
│   │   └── pagination.dto.ts
│   ├── guards
│   │   └── admin.guard.ts
│   ├── modules
│   │   └── organization
│   │       ├── dto

│   │       ├── organization.controller.ts
│   │       └── organization.controller.ts.bak
│   ├── admin.controller.spec.ts
│   ├── admin.controller.ts
│   ├── admin.controller.ts.bak
│   ├── admin.module.ts
│   ├── admin.service.ts
│   └── README.md
├── ai
│   ├── __tests__
│   │   └── document-parser.service.spec.ts
│   ├── config
│   │   └── ai-config.service.ts
│   ├── dto
│   │   ├── ai-mapping.dto.ts
│   │   └── ai-suggestions.dto.ts
│   ├── entities
│   │   └── ai-analysis.entity.ts
│   ├── prompts
│   │   ├── brd-analysis.prompts.ts
│   │   └── form-generation.prompts.ts
│   ├── repositories
│   │   └── ai-analysis.repository.ts
│   ├── services
│   │   ├── ai-analysis.service.ts
│   │   ├── ai-mapping.service.ts
│   │   └── ai-suggestions.service.ts
│   ├── ai-mapping.controller.ts
│   ├── ai-mapping.controller.ts.bak
│   ├── ai-suggestions.controller.ts
│   ├── ai-suggestions.controller.ts.bak
│   ├── ai.module.ts
│   ├── claude.service.ts
│   ├── document-parser.service.ts
│   ├── document-upload.controller.ts
│   ├── document-upload.controller.ts.bak
│   ├── embedding.service.ts
│   ├── llm-provider.service.spec.ts
│   ├── llm-provider.service.ts
│   ├── project-generation.controller.ts
│   ├── project-generation.controller.ts.bak
│   └── vector-database.service.ts
├── architecture
│   ├── dto
│   │   └── architecture-derivation.dto.ts
│   ├── architecture-derivation.service.spec.ts
│   ├── architecture-derivation.service.ts
│   ├── architecture.controller.ts
│   ├── architecture.controller.ts.bak
│   ├── architecture.module.ts
│   └── README.md
├── billing
│   ├── controllers
│   │   └── billing.controller.ts
│   ├── dto
│   │   ├── create-subscription.dto.ts
│   │   └── update-subscription.dto.ts
│   ├── entities
│   │   ├── plan.entity.ts
│   │   └── subscription.entity.ts
│   ├── guards
│   │   └── plan.guard.ts
│   ├── services
│   │   ├── plans.service.ts
│   │   └── subscriptions.service.ts
│   ├── billing.controller.spec.ts
│   └── billing.module.ts
├── bootstrap
│   ├── demo-bootstrap.service.ts
│   └── demo.module.ts
├── brd
│   ├── controllers
│   │   ├── brd-project-planning.controller.spec.ts
│   │   ├── brd-project-planning.controller.spec.ts.bak
│   │   ├── brd-project-planning.controller.ts
│   │   ├── brd-project-planning.controller.ts.bak
│   │   ├── brd.controller.ts
│   │   └── brd.controller.ts.bak
│   ├── database
│   │   └── migrations
│   │       ├── 1704467100000-CreateBRDTable.ts
│   │       ├── 1704467100000-CreateBRDTable.ts.backup2
│   │       ├── 1704467100000-CreateBRDTable.ts.backup3
│   │       ├── 1704467100000-CreateBRDTable.ts.backup4
│   │       ├── 1704467100000-CreateBRDTable.ts.backup5
│   │       ├── 1755044978000-AddChangesMadeToGeneratedProjectPlan.ts
│   │       └── 1755044979000-CreateBRDProjectPlanning.ts
│   ├── dto
│   │   ├── brd-analysis.dto.ts
│   │   ├── brd-list-query.dto.ts
│   │   ├── brd-project-planning.dto.ts
│   │   ├── brd-query.dto.ts
│   │   ├── brd-response.dto.ts
│   │   ├── create-brd.dto.ts
│   │   ├── index.ts
│   │   ├── publish-brd.dto.ts
│   │   └── update-brd.dto.ts
│   ├── entities
│   │   ├── brd-analysis.entity.ts
│   │   ├── brd.entity.ts
│   │   ├── generated-project-plan.entity.ts
│   │   └── index.ts
│   ├── repositories
│   │   ├── brd.repository.ts
│   │   └── index.ts
│   ├── schema
│   │   └── brd.seed.json
│   ├── services
│   │   ├── __tests__
│   │   │   └── brd.service.spec.ts
│   │   ├── brd-analysis.service.ts
│   │   └── brd.service.ts
│   ├── validation
│   │   ├── __tests__
│   │   │   └── brd-validation.service.spec.ts
│   │   └── brd-validation.service.ts
│   ├── brd.module.ts
│   └── README.md
├── common
│   ├── decorators
│   │   └── tenant.decorator.ts
│   ├── filters

│   ├── guards
│   │   └── rate-limiter.guard.ts
│   ├── http
│   │   ├── auth-request.ts
│   │   ├── get-auth-context-optional.ts
│   │   ├── get-auth-context.spec.ts
│   │   └── get-auth-context.ts
│   ├── interceptors
│   │   ├── logging.interceptor.ts
│   │   └── transform-response.interceptor.ts
│   ├── security
│   │   └── token-hash.util.ts
│   └── utils
│       ├── commit-sha.resolver.spec.ts
│       ├── commit-sha.resolver.ts
│       ├── slug.util.spec.ts
│       ├── slug.util.ts
│       └── uuid-validator.util.ts
├── config
│   ├── ai.config.ts
│   ├── configuration.ts
│   ├── data-source-production.ts
│   ├── data-source.ts
│   ├── data-source.ts.bak
│   ├── database.config.ts
│   ├── feature-flags.config.ts
│   └── jwt.config.ts
├── dashboard
│   ├── dto
│   │   └── dashboard-response.dto.ts
│   ├── dashboard.controller.ts
│   ├── dashboard.controller.ts.bak
│   ├── dashboard.module.ts
│   └── dashboard.service.ts
├── database
│   ├── seeds
│   │   ├── billing.seed.ts
│   │   ├── templates-phase2.seed.ts
│   │   └── templates.seed.ts
│   └── organization.repo.ts
├── email
│   └── email.module.ts
├── feedback
│   ├── controllers
│   │   ├── feedback.controller.ts
│   │   └── feedback.controller.ts.bak
│   ├── dto
│   │   └── create-feedback.dto.ts
│   ├── entities
│   │   └── feedback.entity.ts
│   ├── services
│   │   └── feedback.service.ts
│   └── feedback.module.ts
├── filters
│   └── all-exceptions.filter.ts
├── guards
│   └── tenant.guard.ts
├── health
│   ├── health.controller.ts
│   └── health.module.ts
├── intelligence
│   ├── intelligence.controller.ts
│   └── intelligence.module.ts
├── middleware
│   └── tenant.middleware.ts
├── migrations
│   ├── 001-create-roles-table.sql
│   ├── 1000000000000-InitCoreSchema.ts
│   ├── 1756696874831-ProductionBaseline2025.ts
│   ├── 1757000000000-EnsureProjectsTableExists.ts
│   ├── 1757227595839-AddProjectPhases.ts
│   ├── 1757227595840-CreateResourceManagementSystem.ts
│   ├── 1757227595841-CreateAuditAndIndexes.ts
│   ├── 1757254542149-AddTaskManagementSystem.ts
│   ├── 1757255630596-CreateUsersTable.ts
│   ├── 1757255630597-FixUsersTableSchema.ts
│   ├── 1757255630598-EnsureSnakeCaseColumns.ts
│   ├── 1757255642228-FixTaskUserReferences.ts
│   ├── 1757826448476-fix-auth-mvp.ts
│   ├── 1761436371432-CreateWorkspacesTable.ts
│   ├── 1761437995601-AddSoftDeletedAtColumn.ts
│   ├── 1762000000000-AddWorkspaceIdToProjects.ts
│   ├── 1762200000000-EnsureDemoUser.ts
│   ├── 1762200000000-ProtectDemoUsers.ts
│   ├── 1763000000000-CreateProjectTemplateTable.ts
│   ├── 1763000000001-UpdateProjectTemplateColumns.ts
│   ├── 1764000000000-AddIsActiveToProjectTemplates.ts
│   ├── 1764000000001-CreateBillingTables.ts
│   ├── 1765000000001-AddOwnerIdToWorkspaces.ts
│   ├── 1765000000002-CreateWorkspaceMembers.ts
│   ├── 1765000000003-MakeProjectWorkspaceIdRequired.ts
│   ├── 1765000000004-AddAdminRoleToWorkspaceMembers.ts
│   ├── 1765000000005-AddPermissionsConfigToWorkspaces.ts
│   ├── 1765000000006-ExtendTemplateEntitiesForPhase4.ts
│   ├── 1765000000007-AddRiskAndKpiPresetsToTemplates.ts
│   ├── 1765000000008-UpdateWorkspaceMemberRoles.ts
│   ├── 1766000000001-CreatePhase8AnalyticsTables.ts
│   ├── 1766000000002-CreateSignalsAndRagTables.ts
│   ├── 1767000000001-AddResourceIntelligenceFields.ts
│   ├── 1767000000001-CreateTeamsTables.ts
│   ├── 1767000000002-CreateResourceDailyLoadTable.ts
│   ├── 1767159662041-FixWorkspacesDeletedAt.ts
│   ├── 1767376476696-AddConflictLifecycleFields.ts
│   ├── 1767485030157-Phase4PortfoliosPrograms.ts
│   ├── 1767550031000-Phase4DashboardStudio.ts
│   ├── 1767590539000-AddDashboardSharing.ts
│   ├── 1767637754000-Phase5WorkManagementCore.ts
│   ├── 1767752663000-AddWorkPhaseAndPhaseIdToTasks.ts
│   ├── 1767753000000-AddProjectStateAndStructureLocking.ts
│   ├── 1767767013714-AddProjectHealthFields.ts
│   ├── 1768000000000-AddSprint4TemplateRecommendationFields.ts
│   ├── 1768000000001-AddInternalManagedToOrganizations.ts
│   ├── 1769000000001-CreateWorkspaceModuleConfigs.ts
│   ├── 1769000000002-CreateIntegrationTables.ts
│   ├── 1769000000003-AddExternalTaskLoadToResourceDailyLoad.ts
│   ├── 1769000000101-AddTemplateV1Columns.ts
│   ├── 1769000000102-AddLegoBlockV1Columns.ts
│   ├── 1769000000103-CreateTemplateBlocksV1.ts
│   ├── 1769000000104-AddProjectTemplateSnapshot.ts
│   ├── 1769000000105-AddTemplateIdToProjectTemplates.ts
│   ├── 1769000000106-CreateAndLinkTemplatesFromProjectTemplates.ts
│   ├── 1769000000107-BackfillTemplatesV1Fields.ts
│   ├── 1769000000108-BackfillTemplateBlocksV1.ts
│   ├── 1770000000000-Sprint5AckTokens.ts
│   ├── 1770000000001-CreateAuthTables.ts
│   ├── 1770000000001-Sprint5AuditEvents.ts
│   ├── 1771000000000-Sprint6WorkspaceRoles.ts
│   ├── 1772000000000-Sprint6DeliveryOwner.ts
│   ├── 1772000000001-EnsureWorkspaceMembersRoleConstraint.ts
│   ├── 1773000000000-AddHomeNotesToWorkspaces.ts
│   ├── 1774000000000-CreateWorkspaceInviteLinks.ts
│   ├── 1775000000000-AddMemberStatusToWorkspaceMembers.ts
│   ├── 1776000000000-CreateOrgInviteWorkspaceAssignments.ts
│   ├── 1777000000000-EnsureWorkspaceSlugUniquePerOrg.ts
│   ├── 1778000000000-CreateNotificationsTables.ts
│   ├── 1778000000001-CreateAuthSessionsTable.ts
│   ├── 1778000000002-AddUniqueIndexToRefreshTokenHash.ts
│   ├── 1785555555000-CreateWorkItemsTable.ts
│   ├── 1786000000000-CreateWorkItemCommentsAndActivities.ts
│   ├── 1786000000000-Phase2ResourceSchemaUpdates.ts
│   ├── 1786000000001-CreateResourceConflictsTable.ts
│   ├── 1787000000000-BackfillWorkspaceSlugs.ts
│   ├── 1788000000000-MigratePortfoliosProgramsToWorkspaceScoped.ts
│   ├── 1789000000000-AddActiveKpiIdsToProjects.ts
│   ├── 1790000000000-AddTemplateScopeAndWorkspaceId.ts
│   ├── 20240101-create-resource-allocations.sql
│   ├── 20240101-create-resource-tables.sql
│   ├── 20240102-create-template-system.sql
│   ├── 20240103-seed-templates.sql
│   ├── add-task-resource-fields.sql
│   ├── create-refresh-tokens-table.sql
│   └── create-task-dependencies-table.sql
├── migrations-archive
│   ├── 1755931275134-AddLastLoginToUser.ts
│   ├── 1755931653070-AddLastLoginToUser.ts
│   ├── 1756311000000-CreateWaitlistOnly.ts
│   ├── 1756400000001-CoreTables.ts
│   ├── 1756400000002-FixNamingAndConstraints.ts
│   ├── 1756400000003-FixTemplateIdColumn.ts
│   ├── 1756483769290-AddSettingsAndUserManagement.ts
│   ├── 1756690611596-SafeProductionDatabaseSetup.ts
│   ├── 1756692157403-CreateResourceAllocationTable.ts
│   ├── 1756693487970-DebugWhatExists.ts
│   └── 1756700000000-AddPortfolioProgramTables.ts
├── modules
│   ├── ai
│   │   ├── actions
│   │   │   └── action-registry.service.ts
│   │   ├── context
│   │   │   └── context-builder.service.ts
│   │   ├── policy
│   │   │   └── policy-matrix.service.ts
│   │   ├── ai-assistant.service.ts
│   │   └── ai.module.ts
│   ├── ai-orchestrator
│   │   ├── controllers
│   │   │   └── ai-orchestrator.controller.ts
│   │   ├── dto

│   │   ├── services
│   │   │   └── ai-orchestrator.service.ts
│   │   └── ai-orchestrator.module.ts
│   ├── analytics
│   │   ├── controllers
│   │   │   └── analytics.controller.ts
│   │   ├── dto

│   │   ├── entities
│   │   │   ├── materialized-portfolio-metrics.entity.ts
│   │   │   ├── materialized-project-metrics.entity.ts
│   │   │   └── materialized-resource-metrics.entity.ts
│   │   ├── services
│   │   │   └── analytics.service.ts
│   │   └── analytics.module.ts
│   ├── auth
│   │   ├── controllers
│   │   │   ├── org-invites.controller.ts
│   │   │   ├── organization-signup.controller.ts
│   │   │   └── sessions.controller.ts
│   │   ├── decorators
│   │   │   ├── current-user.decorator.ts
│   │   │   └── get-user.decorator.ts
│   │   ├── dto
│   │   │   ├── email-verification-response.dto.ts
│   │   │   ├── forgot-password.dto.ts
│   │   │   ├── invite.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   ├── organization-signup.dto.ts
│   │   │   ├── refresh-token.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   ├── resend-verification.dto.ts
│   │   │   ├── signup.dto.ts
│   │   │   └── verify-email.dto.ts
│   │   ├── entities
│   │   │   ├── auth-outbox.entity.ts
│   │   │   ├── auth-session.entity.ts
│   │   │   ├── email-verification-token.entity.ts
│   │   │   ├── email-verification.entity.ts
│   │   │   ├── org-invite-workspace-assignment.entity.ts
│   │   │   ├── org-invite.entity.ts
│   │   │   └── refresh-token.entity.ts
│   │   ├── guards
│   │   │   ├── admin.guard.ts
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── local-auth.guard.ts
│   │   │   ├── rate-limiter.guard.ts
│   │   │   └── require-email-verified.guard.ts
│   │   ├── services
│   │   │   ├── auth-registration.service.ts
│   │   │   ├── email-verification.service.ts
│   │   │   ├── org-invites.service.ts
│   │   │   ├── organization-signup.service.ts
│   │   │   └── outbox-processor.service.ts
│   │   ├── strategies
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   ├── utils

│   │   ├── auth-session-refresh.spec.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.integration.spec.ts
│   │   ├── auth.module.ts
│   │   ├── auth.routes.spec.ts
│   │   └── auth.service.ts
│   ├── cache
│   │   ├── cache.module.ts
│   │   └── cache.service.ts
│   ├── commands
│   │   ├── controllers
│   │   │   └── command.controller.ts
│   │   ├── services
│   │   │   └── command.service.ts
│   │   └── command.module.ts
│   ├── custom-fields
│   │   ├── dto
│   │   │   ├── create-custom-field.dto.ts
│   │   │   └── update-custom-field.dto.ts
│   │   ├── entities
│   │   │   └── custom-field.entity.ts
│   │   ├── services
│   │   │   └── custom-fields.service.ts
│   │   ├── custom-fields.controller.ts
│   │   └── custom-fields.module.ts
│   ├── dashboards
│   │   ├── controllers
│   │   │   ├── ai-dashboard.controller.ts
│   │   │   ├── analytics-widgets.controller.ts
│   │   │   ├── dashboard-templates.controller.ts
│   │   │   ├── dashboards.controller.ts
│   │   │   ├── metrics.controller.ts
│   │   │   └── project-dashboard.controller.ts
│   │   ├── dto
│   │   │   ├── activate-template.dto.ts
│   │   │   ├── create-dashboard.dto.ts
│   │   │   ├── create-metric.dto.ts
│   │   │   ├── create-widget.dto.ts
│   │   │   ├── share-enable.dto.ts
│   │   │   ├── shared-dashboard.dto.ts
│   │   │   ├── update-dashboard.dto.ts
│   │   │   ├── update-metric.dto.ts
│   │   │   └── update-widget.dto.ts
│   │   ├── entities
│   │   │   ├── dashboard-template.entity.ts
│   │   │   ├── dashboard-widget.entity.ts
│   │   │   ├── dashboard.entity.ts
│   │   │   └── metric-definition.entity.ts
│   │   ├── guards
│   │   │   └── optional-jwt-auth.guard.ts
│   │   ├── services
│   │   │   ├── dashboards.service.spec.ts
│   │   │   ├── dashboards.service.ts
│   │   │   ├── project-dashboard.service.ts
│   │   │   └── templates.service.ts
│   │   ├── widgets
│   │   │   └── widget-allowlist.ts
│   │   ├── dashboards-mutations.integration.spec.ts
│   │   ├── dashboards-share.integration.spec.ts
│   │   └── dashboards.module.ts
│   ├── demo-requests
│   │   ├── dto
│   │   │   └── create-demo-request.dto.ts
│   │   ├── demo-request.controller.ts
│   │   └── demo-request.service.ts
│   ├── docs
│   │   ├── dto
│   │   │   ├── create-doc.dto.ts
│   │   │   └── update-doc.dto.ts
│   │   ├── entities
│   │   │   └── doc.entity.ts
│   │   ├── docs.controller.ts
│   │   ├── docs.module.ts
│   │   └── docs.service.ts
│   ├── domain-events
│   │   ├── subscribers
│   │   │   ├── analytics-event.subscriber.ts
│   │   │   └── knowledge-index-event.subscriber.ts
│   │   ├── domain-events.module.ts
│   │   ├── domain-events.publisher.ts
│   │   └── domain-events.types.ts
│   ├── forms
│   │   ├── dto
│   │   │   ├── create-form.dto.ts
│   │   │   └── update-form.dto.ts
│   │   ├── entities
│   │   │   └── form.entity.ts
│   │   ├── forms.controller.ts
│   │   ├── forms.module.ts
│   │   └── forms.service.ts
│   ├── home
│   │   ├── services
│   │   │   ├── admin-home.service.ts
│   │   │   ├── guest-home.service.ts
│   │   │   └── member-home.service.ts
│   │   ├── home.controller.ts
│   │   ├── home.integration.spec.ts
│   │   └── home.module.ts
│   ├── integrations
│   │   ├── dto
│   │   │   ├── create-external-user-mapping.dto.ts
│   │   │   ├── create-integration-connection.dto.ts
│   │   │   ├── sync-now.dto.ts
│   │   │   └── test-connection.dto.ts
│   │   ├── entities
│   │   │   ├── external-task-event.entity.ts
│   │   │   ├── external-task.entity.ts
│   │   │   ├── external-user-mapping.entity.ts
│   │   │   └── integration-connection.entity.ts
│   │   ├── services
│   │   │   ├── external-task.service.spec.ts
│   │   │   ├── external-task.service.ts
│   │   │   ├── external-user-mapping.service.ts
│   │   │   ├── integration-connection.service.ts
│   │   │   ├── integration-encryption.service.ts
│   │   │   ├── integration-sync.service.spec.ts
│   │   │   ├── integration-sync.service.ts
│   │   │   └── jira-client.service.ts
│   │   ├── utils
│   │   │   └── idempotency.util.ts
│   │   ├── external-user-mappings.controller.spec.ts
│   │   ├── external-user-mappings.controller.ts
│   │   ├── integrations-webhook.controller.spec.ts
│   │   ├── integrations-webhook.controller.ts
│   │   ├── integrations.controller.spec.ts
│   │   ├── integrations.controller.ts
│   │   └── integrations.module.ts
│   ├── knowledge-index
│   │   ├── dto

│   │   ├── entities
│   │   │   └── rag-index.entity.ts
│   │   ├── services
│   │   │   └── knowledge-index.service.ts
│   │   └── knowledge-index.module.ts
│   ├── kpi
│   │   ├── kpi.controller.ts
│   │   ├── kpi.module.ts
│   │   └── kpi.service.ts
│   ├── notifications
│   │   ├── entities
│   │   │   ├── notification-read.entity.ts
│   │   │   └── notification.entity.ts
│   │   ├── notification-dispatch.service.ts
│   │   ├── notifications-read-all.spec.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.module.ts
│   │   └── notifications.service.ts
│   ├── portfolios
│   │   ├── dto
│   │   │   ├── add-projects-to-portfolio.dto.ts
│   │   │   ├── create-portfolio.dto.ts
│   │   │   ├── portfolio-rollup.dto.ts
│   │   │   ├── remove-projects-from-portfolio.dto.ts
│   │   │   └── update-portfolio.dto.ts
│   │   ├── entities
│   │   │   ├── portfolio-project.entity.ts
│   │   │   └── portfolio.entity.ts
│   │   ├── services
│   │   │   ├── portfolios-rollup.service.ts
│   │   │   └── portfolios.service.ts
│   │   ├── portfolios.controller.ts
│   │   └── portfolios.module.ts
│   ├── programs
│   │   ├── dto
│   │   │   ├── assign-program-to-project.dto.ts
│   │   │   ├── create-program.dto.ts
│   │   │   ├── program-rollup.dto.ts
│   │   │   ├── unassign-program-from-project.dto.ts
│   │   │   └── update-program.dto.ts
│   │   ├── entities
│   │   │   ├── program.entity.ts
│   │   │   └── program.entity.ts.bak
│   │   ├── services
│   │   │   ├── programs-rollup.service.ts
│   │   │   └── programs.service.ts
│   │   ├── programs.controller.ts
│   │   └── programs.module.ts
│   ├── projects
│   │   ├── controllers
│   │   │   ├── projects.controller.spec.ts
│   │   │   └── task.controller.ts
│   │   ├── dto
│   │   │   ├── __tests__

│   │   │   ├── assign-user.dto.ts
│   │   │   ├── create-dependency.dto.ts
│   │   │   ├── create-phase.dto.ts
│   │   │   ├── create-project.dto.ts
│   │   │   ├── create-task.dto.ts
│   │   │   ├── link-project.dto.ts
│   │   │   ├── project-summary.dto.ts
│   │   │   ├── project.response.dto.ts
│   │   │   ├── projects-count.dto.ts
│   │   │   └── update-project.dto.ts
│   │   ├── entities
│   │   │   ├── project.entity.ts
│   │   │   ├── task-dependency.entity.ts
│   │   │   └── task.entity.ts
│   │   ├── guards
│   │   │   └── require-project-workspace-role.guard.ts
│   │   ├── methods

│   │   ├── services
│   │   │   ├── dependency.service.ts
│   │   │   ├── projects.service.ts
│   │   │   └── task.service.ts
│   │   ├── projects.controller.spec.ts
│   │   ├── projects.controller.ts
│   │   ├── projects.controller.ts.bak
│   │   ├── projects.module.ts
│   │   └── workspace-projects.controller.ts
│   ├── resources
│   │   ├── controllers
│   │   │   └── resource-seed.controller.ts
│   │   ├── dto
│   │   │   ├── validators

│   │   │   ├── capacity-summary-query.dto.ts
│   │   │   ├── create-allocation.dto.ts
│   │   │   ├── create-resource.dto.ts
│   │   │   ├── detect-conflicts.dto.ts
│   │   │   ├── heat-map-query.dto.ts
│   │   │   ├── resource-list-query.dto.ts
│   │   │   └── update-allocation.dto.ts
│   │   ├── entities
│   │   │   ├── audit-log.entity.ts
│   │   │   ├── resource-allocation.entity.ts
│   │   │   ├── resource-allocation.entity.ts.backup-manual
│   │   │   ├── resource-conflict.entity.ts
│   │   │   ├── resource-daily-load.entity.ts
│   │   │   ├── resource.entity.ts
│   │   │   └── user-daily-capacity.entity.ts
│   │   ├── enums
│   │   │   ├── allocation-type.enum.ts
│   │   │   ├── booking-source.enum.ts
│   │   │   └── units-type.enum.ts
│   │   ├── helpers
│   │   │   ├── capacity-math.helper.ts
│   │   │   └── workspace-scope.helper.ts
│   │   ├── services
│   │   │   ├── audit.service.ts
│   │   │   ├── resource-calculation.service.ts
│   │   │   ├── resource-heat-map.service.ts
│   │   │   ├── resource-risk-score.service.spec.ts
│   │   │   ├── resource-risk-score.service.ts
│   │   │   └── resource-timeline.service.ts
│   │   ├── resource-allocation.controller.ts
│   │   ├── resource-allocation.service.spec.ts
│   │   ├── resource-allocation.service.ts
│   │   ├── resource-conflict.service.ts
│   │   ├── resource-validation.service.ts
│   │   ├── resource-validation.service.ts.backup2
│   │   ├── resource.module.ts
│   │   ├── resources.controller.ts
│   │   ├── resources.service.spec.ts
│   │   └── resources.service.ts
│   ├── risks
│   │   ├── dto

│   │   ├── entities
│   │   │   └── risk.entity.ts
│   │   ├── risk-detection.service.ts
│   │   └── risks.module.ts
│   ├── rollups
│   │   ├── rollups-phase6-closeout.integration.spec.ts
│   │   └── rollups.integration.spec.ts
│   ├── shared
│   │   └── rollups
│   │       └── health-v1.ts
│   ├── signals
│   │   ├── controllers
│   │   │   └── signals.controller.ts
│   │   ├── dto

│   │   ├── entities
│   │   │   └── signals-report.entity.ts
│   │   ├── services
│   │   │   ├── signals-cron.service.ts
│   │   │   └── signals.service.ts
│   │   └── signals.module.ts
│   ├── tasks
│   │   ├── dto
│   │   │   ├── create-task.dto.ts
│   │   │   └── update-task.dto.ts
│   │   ├── entities
│   │   │   ├── task-dependency.entity.ts
│   │   │   └── task.entity.ts
│   │   ├── tasks.controller.ts
│   │   ├── tasks.module.ts
│   │   └── tasks.service.ts
│   ├── teams
│   │   ├── dto
│   │   │   ├── create-team.dto.ts
│   │   │   ├── list-teams-query.dto.ts
│   │   │   └── update-team.dto.ts
│   │   ├── entities
│   │   │   ├── team-member.entity.ts
│   │   │   └── team.entity.ts
│   │   ├── teams.module.ts
│   │   └── teams.service.ts
│   ├── templates
│   │   ├── controllers
│   │   │   ├── lego-blocks.controller.ts
│   │   │   ├── template-actions.controller.ts
│   │   │   ├── template-blocks.controller.ts
│   │   │   ├── template.controller.ts
│   │   │   ├── templates.controller.spec.ts
│   │   │   └── templates.controller.ts
│   │   ├── dto
│   │   │   ├── apply-template.dto.ts
│   │   │   ├── create-from-template.dto.ts
│   │   │   ├── create-template.dto.ts
│   │   │   ├── instantiate-v5-1.dto.ts
│   │   │   ├── recommendations-query.dto.ts
│   │   │   ├── template.dto.ts
│   │   │   └── update-template.dto.ts
│   │   ├── entities
│   │   │   ├── lego-block.entity.ts
│   │   │   ├── project-template.entity.ts
│   │   │   ├── template-block.entity.ts
│   │   │   └── template.entity.ts
│   │   ├── enums
│   │   │   └── template.enums.ts
│   │   ├── guards
│   │   │   ├── block-role.guard.ts
│   │   │   └── template-lock.guard.ts
│   │   ├── services
│   │   │   ├── lego-blocks.service.ts
│   │   │   ├── template-blocks.service.ts
│   │   │   ├── template.service.ts
│   │   │   ├── templates-instantiate-v51.service.ts
│   │   │   ├── templates-instantiate.service.ts
│   │   │   ├── templates-preview-v51.service.ts
│   │   │   ├── templates-recommendation.service.ts
│   │   │   ├── templates.service.spec.ts
│   │   │   └── templates.service.ts
│   │   ├── template.controller.ts
│   │   ├── template.module.ts
│   │   └── template.service.ts
│   ├── tenancy
│   │   ├── helpers
│   │   │   └── job-tenant.helper.ts
│   │   ├── types
│   │   │   └── tenant-job.types.ts
│   │   ├── tenancy.module.ts
│   │   ├── tenant-aware-repository.provider.ts
│   │   ├── tenant-aware.repository.ts
│   │   ├── tenant-context.interceptor.ts
│   │   ├── tenant-context.service.spec.ts
│   │   ├── tenant-context.service.ts
│   │   └── workspace-scoped.decorator.ts
│   ├── users
│   │   ├── controllers
│   │   │   └── users.controller.ts
│   │   ├── entities
│   │   │   ├── user-settings.entity.ts
│   │   │   ├── user.entity.ts
│   │   │   └── user.entity.ts.bak
│   │   ├── services
│   │   │   ├── notification-preferences.service.ts
│   │   │   └── users.service.ts
│   │   ├── users.module.ts
│   │   └── users.service.ts
│   ├── work-items
│   │   ├── dto
│   │   │   ├── bulk-delete-work-items.dto.ts
│   │   │   ├── bulk-update-work-items.dto.ts
│   │   │   ├── create-work-item-comment.dto.ts
│   │   │   ├── create-work-item.dto.ts
│   │   │   ├── my-work-response.dto.ts
│   │   │   ├── update-work-item.dto.ts
│   │   │   └── work-item-response.dto.ts
│   │   ├── entities
│   │   │   ├── work-item-activity.entity.ts
│   │   │   ├── work-item-comment.entity.ts
│   │   │   └── work-item.entity.ts
│   │   ├── helpers
│   │   │   └── work-item-permissions.helper.ts
│   │   ├── services
│   │   │   ├── my-work.service.ts
│   │   │   ├── work-item-activity.service.ts
│   │   │   └── work-item-comment.service.ts
│   │   ├── my-work.controller.ts
│   │   ├── my-work.integration.spec.ts
│   │   ├── work-item.controller.ts
│   │   ├── work-item.controller.ts.bak
│   │   ├── work-item.module.ts
│   │   ├── work-item.service.ts
│   │   └── work-items-bulk.integration.spec.ts
│   ├── work-management
│   │   ├── controllers
│   │   │   ├── work-phases.controller.ts
│   │   │   ├── work-plan.controller.ts
│   │   │   └── work-tasks.controller.ts
│   │   ├── dto
│   │   │   ├── add-comment.dto.ts
│   │   │   ├── add-dependency.dto.ts
│   │   │   ├── bulk-status-update.dto.ts
│   │   │   ├── create-work-task.dto.ts
│   │   │   ├── index.ts
│   │   │   ├── list-work-tasks.query.ts
│   │   │   ├── remove-dependency.dto.ts
│   │   │   ├── update-work-phase.dto.ts
│   │   │   └── update-work-task.dto.ts
│   │   ├── entities
│   │   │   ├── ack-token.entity.ts
│   │   │   ├── audit-event.entity.ts
│   │   │   ├── task-activity.entity.ts
│   │   │   ├── task-comment.entity.ts
│   │   │   ├── task-dependency.entity.ts
│   │   │   ├── work-phase.entity.ts
│   │   │   └── work-task.entity.ts
│   │   ├── enums
│   │   │   └── task.enums.ts
│   │   ├── services
│   │   │   ├── ack-token.service.ts
│   │   │   ├── project-health.service.ts
│   │   │   ├── project-overview.service.ts
│   │   │   ├── project-start.service.ts
│   │   │   ├── project-structure-guard.service.ts
│   │   │   ├── task-activity.service.ts
│   │   │   ├── task-comments.service.ts
│   │   │   ├── task-dependencies.service.spec.ts
│   │   │   ├── task-dependencies.service.ts
│   │   │   ├── work-phases.service.ts
│   │   │   ├── work-plan.service.ts
│   │   │   └── work-tasks.service.ts
│   │   └── work-management.module.ts
│   ├── workspace-access
│   │   ├── workspace-access.module.ts
│   │   ├── workspace-access.service.ts
│   │   └── workspace-role-guard.service.ts
│   └── workspaces
│       ├── decorators
│       │   ├── actor.decorator.ts
│       │   ├── require-workspace-module.decorator.ts
│       │   ├── require-workspace-permission.decorator.ts
│       │   └── require-workspace-role.decorator.ts
│       ├── dto
│       │   ├── add-member.dto.ts
│       │   ├── change-owner.dto.ts
│       │   ├── change-role.dto.ts
│       │   ├── create-invite-link.dto.ts
│       │   ├── create-workspace.dto.ts
│       │   ├── invite-members-email.dto.ts
│       │   ├── join-workspace.dto.ts
│       │   ├── reinstate-member.dto.ts
│       │   ├── suspend-member.dto.ts
│       │   ├── update-owners.dto.ts
│       │   ├── update-workspace.dto.ts
│       │   ├── workspace-summary.dto.ts
│       │   └── workspace.response.dto.ts
│       ├── entities
│       │   ├── workspace-invite-link.entity.ts
│       │   ├── workspace-member.entity.ts
│       │   ├── workspace-module-config.entity.ts
│       │   └── workspace.entity.ts
│       ├── guards
│       │   ├── feature-flag.guard.ts
│       │   ├── require-org-role.guard.spec.ts
│       │   ├── require-org-role.guard.ts
│       │   ├── require-workspace-access.guard.ts
│       │   ├── require-workspace-module.guard.ts
│       │   ├── require-workspace-permission.guard.ts
│       │   └── require-workspace-role.guard.ts
│       ├── modules
│       │   └── workspace-module-registry.ts
│       ├── services
│       │   ├── events.service.ts
│       │   ├── workspace-access.service.spec.ts
│       │   ├── workspace-access.service.ts
│       │   ├── workspace-backfill.service.ts
│       │   ├── workspace-health.service.ts
│       │   ├── workspace-invite.service.ts
│       │   ├── workspace-members.service.ts
│       │   ├── workspace-module.service.ts
│       │   └── workspace-permission.service.ts
│       ├── admin-trash.controller.ts
│       ├── rbac.ts
│       ├── workspace-modules.controller.spec.ts
│       ├── workspace-modules.controller.ts
│       ├── workspace.policy.ts
│       ├── workspaces.controller.spec.ts
│       ├── workspaces.controller.ts
│       ├── workspaces.module.ts
│       └── workspaces.service.ts
├── observability
│   ├── logger.config.ts
│   ├── logger.service.ts
│   ├── metrics.controller.ts
│   ├── metrics.middleware.ts
│   ├── metrics.service.ts
│   ├── metrics.ts
│   ├── observability.module.ts
│   ├── request-id.middleware.ts
│   └── telemetry.service.ts
├── organizations
│   ├── controllers
│   │   ├── invitation-acceptance.controller.ts
│   │   ├── invitation-acceptance.controller.ts.bak
│   │   ├── organizations.controller.ts
│   │   ├── organizations.controller.ts.bak
│   │   ├── team-management.controller.ts
│   │   └── team-management.controller.ts.bak
│   ├── decorators
│   │   ├── current-org.decorator.ts
│   │   ├── current-organization.decorator.ts
│   │   ├── current-user-organization.decorator.ts
│   │   └── roles.decorator.ts
│   ├── dto
│   │   ├── create-organization.dto.ts
│   │   ├── index.ts
│   │   ├── invite-team-member.dto.ts
│   │   ├── invite-user.dto.ts
│   │   ├── team-member-response.dto.ts
│   │   ├── update-member-role.dto.ts
│   │   └── update-organization.dto.ts
│   ├── entities
│   │   ├── index.ts
│   │   ├── invitation.entity.ts
│   │   ├── organization-settings.entity.ts
│   │   ├── organization.entity.ts
│   │   ├── security-settings.entity.ts
│   │   └── user-organization.entity.ts
│   ├── guards
│   │   ├── organization.guard.spec.ts
│   │   ├── organization.guard.ts
│   │   └── roles.guard.ts
│   ├── interfaces
│   │   └── resource-management-settings.interface.ts
│   ├── services
│   │   ├── invitation.service.ts
│   │   ├── organizations.service.ts
│   │   └── team-management.service.ts
│   ├── utils
│   │   ├── resource-settings.util.spec.ts
│   │   └── resource-settings.util.ts
│   └── organizations.module.ts
├── pm
│   ├── controllers
│   │   ├── ai-chat.controller.ts
│   │   ├── ai-chat.controller.ts.bak
│   │   ├── ai-intelligence.controller.ts
│   │   ├── ai-intelligence.controller.ts.bak
│   │   ├── ai-pm-assistant.controller.ts
│   │   ├── ai-pm-assistant.controller.ts.bak
│   │   ├── intake-designer.controller.ts
│   │   ├── intake-designer.controller.ts.bak
│   │   ├── intake-form.controller.ts
│   │   ├── intake-form.controller.ts.bak
│   │   ├── status-reporting.controller.ts
│   │   ├── status-reporting.controller.ts.bak
│   │   ├── workflow-template.controller.ts
│   │   └── workflow-template.controller.ts.bak
│   ├── database
│   │   └── migrations
│   │       ├── disabled

│   │       ├── 1700000000004-CreateBRDTable.ts
│   │       ├── 1700000000004-CreateBRDTable.ts.bak
│   │       ├── 1700000000005-CreateBRDAnalysisTables.ts
│   │       └── 1700000000005-CreateBRDAnalysisTables.ts.bak
│   ├── dto
│   │   ├── ai-form-generation.dto.ts
│   │   ├── intake-form.dto.ts
│   │   └── workflow-template.dto.ts
│   ├── entities
│   │   ├── alert-configuration.entity.ts
│   │   ├── index.ts
│   │   ├── intake-form.entity.ts
│   │   ├── intake-submission.entity.ts
│   │   ├── manual-update.entity.ts
│   │   ├── performance-baseline.entity.ts
│   │   ├── pm-knowledge-chunk.entity.ts
│   │   ├── project-metrics.entity.ts
│   │   ├── project-risk.entity.ts
│   │   ├── project-stakeholder.entity.ts
│   │   ├── project-task.entity.ts
│   │   ├── risk-assessment.entity.ts
│   │   ├── risk-monitoring.entity.ts
│   │   ├── risk-response.entity.ts
│   │   ├── risk.entity.ts
│   │   ├── stakeholder-communication.entity.ts
│   │   ├── user-project.entity.ts
│   │   ├── workflow-instance.entity.ts
│   │   └── workflow-template.entity.ts
│   ├── integrations
│   │   ├── financial.integration.ts
│   │   ├── github.integration.ts
│   │   ├── jira.integration.ts
│   │   └── teams.integration.ts
│   ├── interfaces
│   │   ├── document-intelligence.interface.ts
│   │   └── project-intelligence.interface.ts
│   ├── project-initiation
│   │   ├── dto
│   │   │   ├── document-analysis.dto.ts
│   │   │   ├── project-charter.dto.ts
│   │   │   └── stakeholder-analysis.dto.ts
│   │   ├── project-initiation.controller.ts
│   │   ├── project-initiation.controller.ts.bak
│   │   ├── project-initiation.module.ts
│   │   └── project-initiation.service.ts
│   ├── risk-management
│   │   ├── dto
│   │   │   ├── risk-identification-input.dto.ts
│   │   │   ├── risk-monitoring.dto.ts
│   │   │   └── update-risk-status.dto.ts
│   │   ├── README.md
│   │   ├── risk-management.controller.ts
│   │   ├── risk-management.controller.ts.bak
│   │   ├── risk-management.module.ts
│   │   └── risk-management.service.ts
│   ├── services
│   │   ├── ai-chat.service.ts
│   │   ├── ai-form-generator.service.ts
│   │   ├── ai-pm-assistant.service.ts
│   │   ├── document-intelligence.service.ts
│   │   ├── intake-form.service.ts
│   │   ├── integration.service.ts
│   │   ├── status-reporting.service.ts
│   │   ├── workflow-template.service.ts
│   │   └── zephix-ai-intelligence.service.ts
│   ├── status-reporting
│   │   ├── entities
│   │   │   └── status-report.entity.ts
│   │   ├── status-reporting.controller.ts.bak
│   │   └── status-reporting.module.ts
│   └── pm.module.ts
├── scripts
│   ├── backfill-workspace-owners-and-members.ts
│   ├── backfill-workspace-ownership.ts
│   ├── create-workspace-table.ts
│   ├── dev-seed.ts
│   ├── fix-database.ts
│   ├── fix-user-organization.ts
│   ├── run-migrations.ts
│   ├── run-multi-tenant-migration.ts
│   ├── seed-demo-data.ts
│   ├── seed-phase2-templates.ts
│   ├── seed-resource-conflicts.ts
│   ├── seed-starter-template.ts
│   ├── seed-templates.ts
│   ├── seed-users.ts
│   ├── smoke-test-admin.ts
│   ├── smoke-test-billing.ts
│   ├── smoke-test-integrations.ts
│   ├── smoke-test-projects.ts
│   ├── smoke-test-templates.ts
│   ├── smoke-test-workspace-modules.ts
│   ├── smoke-test-workspaces.ts
│   ├── test-admin-access.ts
│   ├── test-database-integrity.ts
│   ├── test-di.ts
│   └── verify-database.ts
├── shared
│   ├── enums
│   │   ├── platform-roles.enum.spec.ts
│   │   ├── platform-roles.enum.ts
│   │   ├── team-member-role.enum.ts
│   │   ├── team-visibility.enum.ts
│   │   └── workspace-roles.enum.ts
│   ├── filters
│   │   └── api-error.filter.ts
│   ├── guards
│   │   ├── admin-only.guard.spec.ts
│   │   ├── admin-only.guard.ts
│   │   └── admin.guard.ts
│   ├── helpers
│   │   ├── response.helper.spec.ts
│   │   └── response.helper.ts
│   ├── interceptors
│   │   └── envelope.interceptor.ts
│   ├── interfaces
│   │   └── api-response.interface.ts
│   ├── services
│   │   ├── advanced-caching.service.ts
│   │   ├── audit.service.ts
│   │   ├── bulkhead.service.ts
│   │   ├── circuit-breaker.service.ts
│   │   ├── distributed-lock.service.ts
│   │   ├── email.service.ts
│   │   ├── file-validation.service.ts
│   │   ├── index.ts
│   │   ├── queue.service.ts
│   │   ├── redis.service.ts
│   │   ├── response.service.ts
│   │   ├── retry.service.ts
│   │   └── virus-scan.service.ts
│   ├── utils
│   │   └── build-validation-error.ts
│   └── shared.module.ts
├── test
│   └── tenant-isolation.test.ts
├── types
│   └── express-multer.d.ts
├── waitlist
│   ├── dto
│   │   └── create-waitlist.dto.ts
│   ├── entities
│   │   └── waitlist.entity.ts
│   ├── waitlist.controller.ts
│   ├── waitlist.controller.ts.bak
│   ├── waitlist.module.ts
│   └── waitlist.service.ts
├── workflows
│   ├── __tests__
│   │   ├── workflow-templates.controller.spec.ts
│   │   ├── workflow-templates.controller.spec.ts.bak
│   │   └── workflow-templates.service.spec.ts
│   ├── controllers
│   │   ├── workflow-templates.controller.ts
│   │   └── workflow-templates.controller.ts.bak
│   ├── dto
│   │   ├── index.ts
│   │   └── workflow.dto.ts
│   ├── entities
│   │   ├── index.ts
│   │   ├── workflow-approval.entity.ts
│   │   ├── workflow-stage.entity.ts
│   │   ├── workflow-template.entity.ts
│   │   └── workflow-version.entity.ts
│   ├── services
│   │   ├── advanced-workflow-orchestration.service.ts
│   │   ├── index.ts
│   │   ├── workflow-analytics.service.ts
│   │   ├── workflow-archive.service.ts
│   │   ├── workflow-execution-engine.service.ts
│   │   ├── workflow-notification.service.ts
│   │   ├── workflow-templates.service.ts
│   │   └── workflow-validation.service.ts
│   └── workflows.module.ts
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.compile.spec.ts
├── app.module.ts
├── app.module.ts.backup-1755840713
├── app.module.ts.bak
├── app.service.ts
├── build-metadata.ts
├── main.backup.ts
├── main.ts
├── smoke-boot.spec.ts
└── test-minimal.ts
```

## Frontend Source Tree (src/)

```
zephix-frontend/src/
├── api
│   └── waitlist.ts
├── app
│   ├── Header.tsx
│   ├── ProfileMenu.tsx
│   ├── Sidebar.tsx
│   └── WorkspaceSwitcher.tsx
├── archived-admin-components
│   ├── organization
│   │   ├── OrganizationOverview.tsx
│   │   └── UsersManagement.tsx
│   ├── AdminDashboard.tsx
│   ├── AdminUsers.tsx
│   └── placeholders.tsx
├── assets
│   └── react.svg
├── components
│   ├── account
│   │   └── AccountMenu.tsx
│   ├── ai
│   │   ├── AISuggestionInterface.tsx
│   │   ├── FileUploadZone.tsx
│   │   ├── FloatingAIAssistant.tsx
│   │   └── ProjectGenerationConfirmation.tsx
│   ├── auth
│   │   ├── AuthProvider.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── RequireAdmin.tsx
│   ├── command
│   │   └── CommandPalette.tsx
│   ├── commands
│   │   └── CommandPalette.tsx
│   ├── common
│   │   ├── ComingSoon.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ErrorFallback.tsx
│   │   └── LoadingScreen.tsx
│   ├── create

│   ├── dashboard
│   │   ├── __tests__
│   │   │   ├── ChatInterface.test.tsx
│   │   │   ├── DashboardSidebar.test.tsx
│   │   │   ├── ProjectStats.test.tsx
│   │   │   └── RecentProjects.test.tsx
│   │   ├── AIIntelligenceDashboard.lazy.tsx
│   │   ├── AIIntelligenceDashboard.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── DashboardSidebar.tsx
│   │   ├── index.ts
│   │   ├── MyTasksDashboard.tsx
│   │   ├── PortfolioDashboard.tsx
│   │   ├── ProjectKPIWidget.tsx
│   │   ├── ProjectStats.tsx
│   │   ├── QuickActions.tsx
│   │   ├── RecentProjects.tsx
│   │   └── StatsGrid.tsx
│   ├── dashboards
│   │   └── DashboardSwitcher.tsx
│   ├── demo
│   │   ├── AnimatedGanttChart.tsx
│   │   ├── ConfettiEffect.tsx
│   │   └── PerformanceMonitor.tsx
│   ├── feedback
│   │   └── FeedbackWidget.tsx
│   ├── forms
│   │   └── LoginForm.tsx
│   ├── header
│   │   ├── UserMenu.tsx
│   │   └── WorkspaceSwitcher.tsx
│   ├── intake
│   │   ├── AIFormPreview.tsx
│   │   ├── DeploymentOptions.tsx
│   │   ├── FormBuilder.tsx
│   │   ├── FormPreview.tsx
│   │   ├── FormSettings.tsx
│   │   ├── NaturalLanguageDesigner.tsx
│   │   └── RefinementInterface.tsx
│   ├── intelligence
│   │   └── DocumentIntelligence.tsx
│   ├── landing
│   │   ├── __tests__
│   │   │   ├── FeaturesSection.test.tsx
│   │   │   ├── HeroSection.test.tsx
│   │   │   ├── HowItWorksSection.test.tsx
│   │   │   ├── LandingNavbar.test.tsx
│   │   │   └── PricingSection.test.tsx
│   │   ├── shared
│   │   │   ├── AnimatedGrid.tsx
│   │   │   ├── GlassCard.tsx
│   │   │   ├── GradientButton.tsx
│   │   │   ├── SectionError.tsx
│   │   │   └── SectionLoader.tsx
│   │   ├── AboutSection.tsx
│   │   ├── AITeaserSection.tsx
│   │   ├── ComparisonTable.tsx
│   │   ├── CTASection.tsx
│   │   ├── FAQ.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── Footer.tsx
│   │   ├── FounderStory.tsx
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── HeroFixed.tsx
│   │   ├── HeroSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── index.ts
│   │   ├── LandingNavbar.tsx
│   │   ├── MetricCard.tsx
│   │   ├── Navigation.tsx
│   │   ├── NavigationFixed.tsx
│   │   ├── PricingSection.tsx
│   │   ├── ProblemSection.tsx
│   │   ├── SolutionCards.tsx
│   │   ├── SolutionsSection.tsx
│   │   ├── TechValidation.tsx
│   │   └── Timeline.tsx
│   ├── layout
│   │   ├── GlobalHeader.tsx
│   │   ├── Layout.tsx
│   │   ├── PageHeader.tsx
│   │   └── ProtectedLayout.tsx
│   ├── layouts
│   │   ├── admin-nav.config.ts
│   │   ├── AdminLayout.tsx
│   │   └── DashboardLayout.tsx
│   ├── modals
│   │   ├── ContactModal.tsx
│   │   ├── CreateProjectModal.tsx
│   │   ├── DemoRequestModal.tsx
│   │   ├── EarlyAccessModal.tsx
│   │   └── EnhancedCreateProjectModal.tsx
│   ├── navigation
│   │   └── Sidebar.tsx
│   ├── pm
│   │   ├── project-initiation
│   │   │   ├── CharterView.tsx
│   │   │   ├── DocumentUpload.tsx
│   │   │   ├── ProjectInitiationDashboard.tsx
│   │   │   ├── RiskAssessment.tsx
│   │   │   ├── StakeholderMatrix.tsx
│   │   │   └── WBSViewer.tsx
│   │   ├── risk-management
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── RiskManagementDashboard.tsx
│   │   │   ├── RiskRegister.tsx
│   │   │   └── types.ts
│   │   ├── shared
│   │   │   ├── EarnedValueChart.tsx
│   │   │   ├── HealthScoreGauge.tsx
│   │   │   ├── index.ts
│   │   │   └── VarianceIndicator.tsx
│   │   └── status-reporting
│   │       ├── AlertConfiguration.tsx
│   │       ├── PerformanceMetrics.tsx
│   │       ├── ReportExport.tsx
│   │       ├── RiskMonitoring.tsx
│   │       ├── StakeholderViews.tsx
│   │       ├── StatusReportingDashboard.tsx
│   │       └── TrendAnalysis.tsx
│   ├── projects
│   │   ├── CreateProjectPanel.tsx
│   │   ├── ProjectDisplay.tsx
│   │   ├── ProjectEditForm.tsx
│   │   ├── ProjectResources.tsx
│   │   └── TaskManagement.tsx
│   ├── resources
│   │   ├── __tests__
│   │   │   └── ResourceHeatmapCell.test.tsx
│   │   ├── AssignResourceModal.backup.tsx
│   │   ├── AssignResourceModal.tsx
│   │   ├── ConflictResolver.tsx
│   │   ├── CreateResourceModal.tsx
│   │   ├── ResourceHeatMap.tsx
│   │   ├── ResourceHeatmapCell.tsx
│   │   └── ResourceHeatmapGrid.tsx
│   ├── routing
│   │   ├── ProtectedRoute.tsx
│   │   ├── PublicRoute.tsx
│   │   ├── RouteLogger.tsx
│   │   └── WorkspaceContextGuard.tsx
│   ├── security
│   │   ├── AuthTestResults.tsx
│   │   ├── SecurityDashboard.tsx
│   │   └── SecurityMonitor.tsx
│   ├── shell
│   │   ├── AiAssistantPanel.tsx
│   │   ├── AiToggleButton.tsx
│   │   ├── DemoBanner.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── UserProfileDropdown.tsx
│   ├── system
│   │   └── ErrorBoundary.tsx
│   ├── tasks
│   │   ├── CreateTaskForm.backup.tsx
│   │   ├── CreateTaskForm.tsx
│   │   ├── CreateTaskModal.tsx
│   │   ├── EditTaskModal.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskList.backup.tsx
│   │   └── TaskList.tsx
│   ├── templates
│   │   └── TemplateCreateModal.tsx
│   ├── ui
│   │   ├── __tests__
│   │   │   └── StatusBadge.test.tsx
│   │   ├── button
│   │   │   ├── __tests__

│   │   │   └── Button.tsx
│   │   ├── card
│   │   │   └── Card.tsx
│   │   ├── feedback
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBanner.tsx
│   │   │   └── Skeleton.tsx
│   │   ├── form
│   │   │   ├── __tests__

│   │   │   ├── Checkbox.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── FormField.tsx
│   │   │   ├── FormGroup.tsx
│   │   │   ├── Radio.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Switch.tsx
│   │   │   └── Textarea.tsx
│   │   ├── input
│   │   │   ├── __tests__

│   │   │   └── Input.tsx
│   │   ├── layout
│   │   │   └── PageHeader.tsx
│   │   ├── overlay
│   │   │   ├── __tests__

│   │   │   ├── Drawer.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Pagination.tsx
│   │   │   └── Tabs.tsx
│   │   ├── table
│   │   │   ├── __tests__

│   │   │   └── DataTable.tsx
│   │   ├── alert.tsx
│   │   ├── badge.tsx
│   │   ├── Button.stories.tsx
│   │   ├── Button.tsx
│   │   ├── card.tsx
│   │   ├── Form.stories.tsx
│   │   ├── Form.tsx
│   │   ├── Link.tsx
│   │   ├── LoadingSpinner.stories.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── OrganizationSwitcher.tsx
│   │   ├── ProjectCard.stories.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── Skeleton.tsx
│   │   └── StatusBadge.tsx
│   ├── views
│   │   ├── BoardView.tsx
│   │   ├── GanttChart.tsx
│   │   └── TimelineView.tsx
│   ├── workflow
│   │   ├── StageEditor.tsx
│   │   ├── StageLibrary.tsx
│   │   ├── TemplateSettings.tsx
│   │   └── WorkflowCanvas.tsx
│   ├── workspace
│   │   ├── SuspendedAccessScreen.tsx
│   │   ├── WorkspaceAccessStates.tsx
│   │   ├── WorkspaceMenu.tsx
│   │   ├── WorkspaceSelectionScreen.tsx
│   │   └── WorkspaceSwitcher.tsx
│   ├── ChatInterface.tsx
│   ├── CommandPalette.tsx
│   ├── ErrorBoundary.tsx
│   ├── FileUpload.tsx
│   └── WorkspaceGuard.tsx
├── config
│   ├── env.example.ts
│   ├── features.ts
│   ├── phase5_1.ts
│   ├── security.config.ts
│   └── sentry.ts
├── constants
│   └── phase5_1.copy.ts
├── features
│   ├── admin
│   │   ├── ai
│   │   │   └── AiSettingsPage.tsx
│   │   ├── api
│   │   │   └── adminWorkspaces.api.ts
│   │   ├── billing
│   │   │   └── BillingOverviewPage.tsx
│   │   ├── components
│   │   │   ├── CreateWorkspaceModal.tsx
│   │   │   └── ManageOwnersModal.tsx
│   │   ├── groups
│   │   │   ├── CreateGroupModal.tsx
│   │   │   ├── GroupEditPage.tsx
│   │   │   ├── groups.api.ts
│   │   │   └── GroupsListPage.tsx
│   │   ├── kpis
│   │   │   └── pages

│   │   ├── organization
│   │   │   ├── DirectoryPage.tsx
│   │   │   ├── NotificationsPage.tsx
│   │   │   └── OrganizationProfilePage.tsx
│   │   ├── overview
│   │   │   ├── AdminOverview.api.ts
│   │   │   └── AdminOverviewPage.tsx
│   │   ├── permissions
│   │   │   └── RolesPermissionsPage.tsx
│   │   ├── security
│   │   │   ├── AuthenticationSettingsPage.tsx
│   │   │   └── CompliancePage.tsx
│   │   ├── teams
│   │   │   ├── api

│   │   │   ├── components

│   │   │   └── hooks

│   │   ├── templates
│   │   │   └── AdminTemplatesPage.tsx
│   │   ├── usage
│   │   │   └── UsageStatsPage.tsx
│   │   ├── users
│   │   │   ├── CreateUserModal.tsx
│   │   │   ├── UserEditPage.tsx
│   │   │   ├── users.api.ts
│   │   │   └── UsersListPage.tsx
│   │   ├── utils
│   │   │   └── getOrgUsers.ts
│   │   └── workspaces
│   │       ├── CreateWorkspaceModal.tsx
│   │       ├── WorkspaceDefaultsPage.tsx
│   │       ├── WorkspaceEditPage.tsx
│   │       ├── workspaces.api.ts
│   │       └── WorkspacesListPage.tsx
│   ├── dashboards
│   │   ├── widgets
│   │   │   ├── conflict-trends.tsx
│   │   │   ├── format.ts
│   │   │   ├── hooks.ts
│   │   │   ├── project-health.tsx
│   │   │   ├── resource-utilization.tsx
│   │   │   ├── types.ts
│   │   │   └── WidgetRenderer.tsx
│   │   ├── AICopilotPanel.tsx
│   │   ├── analytics-api.ts
│   │   ├── api.ts
│   │   ├── DashboardCreateModal.tsx
│   │   ├── filters.ts
│   │   ├── FiltersBar.tsx
│   │   ├── schemas.ts
│   │   ├── ShareDialog.tsx
│   │   ├── types.ts
│   │   ├── useAutosave.ts
│   │   ├── useDashboards.ts
│   │   ├── widget-registry.ts
│   │   ├── widgetQueryApi.ts
│   │   └── workspace-header.ts
│   ├── docs
│   │   └── api.ts
│   ├── forms
│   │   └── api.ts
│   ├── notifications
│   │   └── api
│   │       ├── __tests__

│   │       └── useNotifications.ts
│   ├── projects
│   │   ├── __tests__
│   │   │   └── ProjectCreateModal.test.tsx
│   │   ├── board
│   │   │   └── ProjectBoardPage.tsx
│   │   ├── components
│   │   │   ├── ProjectKpiPanel.tsx
│   │   │   ├── ProjectLinkingSection.tsx
│   │   │   └── TaskListSection.tsx
│   │   ├── kpis
│   │   │   └── ProjectKpisPage.tsx
│   │   ├── methods
│   │   │   ├── agile

│   │   │   ├── hybrid

│   │   │   ├── kanban

│   │   │   ├── scrum

│   │   │   └── waterfall

│   │   ├── overview
│   │   │   └── ProjectOverviewPage.tsx
│   │   ├── risks
│   │   │   └── ProjectRisksPage.tsx
│   │   ├── settings
│   │   │   └── ProjectSettingsPage.tsx
│   │   ├── tasks
│   │   │   └── ProjectTasksPage.tsx
│   │   ├── api.ts
│   │   ├── ProjectCreateModal.tsx
│   │   ├── projects.api.ts
│   │   ├── types.ts
│   │   └── WorkspaceProjectsList.tsx
│   ├── resources
│   │   ├── api
│   │   │   └── useResources.ts
│   │   ├── components
│   │   │   ├── __tests__

│   │   │   ├── GovernedAllocationProvider.tsx
│   │   │   ├── ResourceHeatmap.tsx
│   │   │   └── ResourceJustificationModal.tsx
│   │   ├── hooks
│   │   │   └── useGovernedAllocationMutation.ts
│   │   ├── pages
│   │   │   ├── __tests__

│   │   │   └── ResourcesPage.tsx
│   │   └── utils
│   │       ├── __tests__

│   │       └── allocation-errors.ts
│   ├── risks
│   │   ├── api
│   │   │   └── useRisks.ts
│   │   └── pages
│   │       └── RisksPage.tsx
│   ├── templates
│   │   ├── components
│   │   │   ├── ProjectNameModal.tsx
│   │   │   ├── TemplateCard.tsx
│   │   │   ├── TemplatePreviewModal.tsx
│   │   │   └── UseTemplateModal.tsx
│   │   ├── utils
│   │   │   ├── __tests__

│   │   │   └── order-preservation.ts
│   │   ├── api.ts
│   │   ├── intent.ts
│   │   ├── seed.json
│   │   ├── TemplateDetailPage.tsx
│   │   ├── templates.api.ts
│   │   ├── test-api.ts
│   │   └── types.ts
│   ├── widgets
│   │   └── api.ts
│   ├── work-items
│   │   ├── api.ts
│   │   ├── ProjectTasksList.tsx
│   │   ├── types.ts
│   │   └── WorkItemCreateModal.tsx
│   ├── work-management
│   │   ├── api
│   │   │   └── phases.api.ts
│   │   ├── components
│   │   │   └── AckRequiredModal.tsx
│   │   ├── hooks
│   │   │   ├── __tests__

│   │   │   └── usePhaseUpdate.ts
│   │   └── types
│   │       └── ack.types.ts
│   └── workspaces
│       ├── api
│       │   └── workspace-invite.api.ts
│       ├── components
│       │   ├── WorkspaceSettingsModal

│       │   ├── WorkspaceMemberInviteModal.tsx
│       │   └── WorkspaceModuleGuard.tsx
│       ├── pages
│       │   ├── __tests__

│       │   └── WorkspaceMembersPage.tsx
│       ├── settings
│       │   ├── tabs

│       │   └── WorkspaceSettingsPage.tsx
│       ├── views
│       │   ├── __tests__

│       │   ├── WorkspaceHome.tsx
│       │   └── WorkspaceProjectsPage.tsx
│       ├── api.ts
│       ├── SidebarWorkspaces.tsx
│       ├── types.ts
│       ├── workspace.api.ts
│       ├── WorkspaceCreateModal.tsx
│       └── WorkspaceSettingsAction.ts
├── hooks
│   ├── index.ts
│   ├── useAIRecommendations.ts
│   ├── useAnalytics.ts
│   ├── useApi.ts
│   ├── useAuth.ts
│   ├── useDocumentProcessing.ts
│   ├── useFeedback.ts
│   ├── useMetricCounter.ts
│   ├── useOnboardingCheck.ts
│   ├── usePhase5_1Redirect.ts
│   ├── usePostLoginRedirect.ts
│   ├── useProjectGeneration.ts
│   ├── useProjectInitiation.ts
│   ├── useProjectSelection.ts
│   ├── useScrollAnimation.ts
│   ├── useSecurity.ts
│   ├── useSentryPerformance.ts
│   ├── useSidebar.ts
│   ├── useStatusReporting.ts
│   ├── useUnreadNotifications.ts
│   ├── useUser.ts
│   ├── useWorkspaceModule.ts
│   ├── useWorkspacePermissions.ts
│   └── useWorkspaceRole.ts
├── layouts
│   ├── AdminLayout.tsx
│   └── MainLayout.tsx
├── lib
│   ├── __tests__
│   │   └── api.test.ts
│   ├── api
│   │   ├── __tests__
│   │   │   └── client.test.ts
│   │   ├── client.ts
│   │   ├── endpoints.ts
│   │   ├── errors.ts
│   │   ├── guard.ts
│   │   ├── types.ts
│   │   └── unwrapData.ts
│   ├── providers
│   │   ├── queryConfig.ts
│   │   └── QueryProvider.tsx
│   ├── ui
│   │   └── chartColors.ts
│   ├── analytics.ts
│   ├── animations.ts
│   ├── api.ts
│   ├── constants.ts
│   ├── demo.ts
│   ├── features.ts
│   ├── flags.ts
│   ├── lazyDefault.ts
│   ├── telemetry.ts
│   ├── types.ts
│   └── utils.ts
├── middleware
│   └── security.middleware.ts
├── pages
│   ├── admin
│   │   ├── __tests__
│   │   │   ├── AdminInvitePage.test.tsx
│   │   │   ├── AdminTemplatesPage.test.tsx
│   │   │   └── AdminWorkspacesPage.test.tsx
│   │   ├── _components
│   │   │   ├── AdminErrorState.tsx
│   │   │   ├── AdminPageScaffold.tsx
│   │   │   ├── AdminScaffold.tsx
│   │   │   └── InviteUsersDrawer.tsx
│   │   ├── ai
│   │   │   ├── AIDocumentsPage.tsx
│   │   │   ├── AIInsightsPage.tsx
│   │   │   ├── AIJobsPage.tsx
│   │   │   ├── AIModelsPage.tsx
│   │   │   └── AIPipelinesPage.tsx
│   │   ├── AdminArchivePage.tsx
│   │   ├── AdminAuditPage.tsx
│   │   ├── AdminBillingPage.tsx
│   │   ├── AdminCustomFieldsPage.tsx
│   │   ├── AdminDashboardPage.tsx
│   │   ├── AdminHomePage.tsx
│   │   ├── AdminInvitePage.tsx
│   │   ├── AdminLayout.tsx
│   │   ├── AdminOrganizationPage.tsx
│   │   ├── AdminOverviewPage.tsx
│   │   ├── AdminProjectsPage.tsx
│   │   ├── AdminRolesPage.tsx
│   │   ├── AdminSecurityPage.tsx
│   │   ├── AdminTeamsPage.tsx
│   │   ├── AdminTemplateBuilderPage.tsx
│   │   ├── AdminTemplatesPage.tsx
│   │   ├── AdminTrashPage.tsx
│   │   ├── AdminUsagePage.tsx
│   │   ├── AdminUsersPage.tsx
│   │   ├── AdminWorkspacesPage.tsx
│   │   ├── ApiKeysPage.tsx
│   │   ├── AuditLogsPage.tsx
│   │   ├── BillingPage.tsx
│   │   ├── DepartmentsPage.tsx
│   │   ├── IntegrationsPage.tsx
│   │   ├── KpisPage.tsx
│   │   ├── OrganizationPage.tsx
│   │   ├── PermissionsPage.tsx
│   │   ├── RolesPage.tsx
│   │   ├── SecurityPage.tsx
│   │   ├── TemplatesPage.tsx
│   │   ├── UsersPage.tsx
│   │   └── WorkspacesPage.tsx
│   ├── ai
│   │   ├── AIMappingPage.tsx
│   │   └── AISuggestionsPage.tsx
│   ├── auth
│   │   ├── EmailVerificationPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── InviteAcceptPage.tsx
│   │   ├── InvitePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── LoginPage.tsx.bak
│   │   ├── OrganizationSignupPage.tsx
│   │   ├── PendingVerificationPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── VerifyEmailPage.tsx
│   ├── billing
│   │   └── BillingPage.tsx
│   ├── collaboration
│   │   └── CollaborationPage.tsx
│   ├── dashboard
│   │   ├── AIDashboard.tsx
│   │   ├── DashboardPage.tsx
│   │   └── ResourceHeatMap.tsx
│   ├── dev
│   │   └── RouteTestPage.tsx
│   ├── docs
│   │   └── DocsPage.tsx
│   ├── examples
│   │   └── TestPage.tsx
│   ├── forms
│   │   └── FormsPage.tsx
│   ├── hub
│   │   ├── HubPage.tsx
│   │   └── ProjectsSection.tsx
│   ├── intake
│   │   └── IntakeFormsPage.tsx
│   ├── intelligence
│   │   └── DocumentIntelligencePage.tsx
│   ├── my-work
│   │   └── MyWorkPage.tsx
│   ├── onboarding
│   │   └── OnboardingPage.tsx
│   ├── organizations
│   │   ├── OrganizationSettings.tsx
│   │   └── TeamManagement.tsx
│   ├── pm
│   │   ├── project
│   │   │   └── [id]

│   │   └── project-initiation.tsx
│   ├── portfolios
│   │   ├── PortfolioDetailPage.tsx
│   │   └── PortfoliosListPage.tsx
│   ├── profile
│   │   └── ProfilePage.tsx
│   ├── programs
│   │   ├── ProgramDetailPage.tsx
│   │   └── ProgramsListPage.tsx
│   ├── projects
│   │   ├── __tests__
│   │   │   └── ProjectsPage.test.tsx
│   │   ├── ProjectDetailPage.tsx
│   │   ├── ProjectsDashboard.tsx
│   │   ├── ProjectsPage.tsx
│   │   └── ProjectsPageDebug.tsx
│   ├── reports
│   │   └── ReportsPage.tsx
│   ├── resources
│   │   ├── ResourceHeatmapPage.tsx
│   │   └── ResourceTimelinePage.tsx
│   ├── security
│   │   └── AuthTestPage.tsx
│   ├── settings
│   │   ├── __tests__
│   │   │   └── SettingsPage.test.tsx
│   │   ├── components
│   │   │   ├── AccountSettings.tsx
│   │   │   ├── OrganizationSettings.tsx
│   │   │   └── WorkspaceSettings.tsx
│   │   ├── NotificationsSettingsPage.tsx
│   │   ├── SecuritySettingsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── system
│   │   ├── Forbidden.tsx
│   │   └── NotFound.tsx
│   ├── team
│   │   └── TeamPage.tsx
│   ├── teams
│   │   └── TeamsPage.tsx
│   ├── templates
│   │   ├── __tests__
│   │   │   └── TemplatesPage.test.tsx
│   │   ├── CreateTemplateModal.tsx
│   │   ├── InstantiateTemplateModal.tsx
│   │   ├── TemplateCenterPage.tsx
│   │   ├── TemplateHubPage.tsx
│   │   ├── TemplateKpiSelector.tsx
│   │   ├── TemplatesPage.tsx
│   │   └── TemplateStructureEditor.tsx
│   ├── workflows
│   │   └── WorkflowsPage.tsx
│   ├── workspaces
│   │   ├── WorkspaceHomePage.tsx
│   │   └── WorkspacesPage.tsx
│   ├── AIMappingPage.tsx
│   ├── AISuggestionsDemoPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── BlogPage.tsx
│   ├── CareersPage.tsx
│   ├── CollaborationDemoPage.tsx
│   ├── Dashboard.tsx
│   ├── DiagnosticsPage.tsx
│   ├── DocsPage.tsx
│   ├── HealthPage.tsx
│   ├── InboxPage.tsx
│   ├── IntakeFormBuilder.tsx
│   ├── IntakeFormList.tsx
│   ├── landing-backup.tsx
│   ├── LandingPage.tsx
│   ├── NotFoundPage.tsx
│   ├── PrivacyPage.tsx
│   ├── ProfilePage.tsx
│   ├── PublicIntakeForm.tsx
│   ├── ResourcesPage.tsx
│   ├── RoadmapPage.tsx
│   ├── SecurityPage.tsx
│   ├── TermsPage.tsx
│   ├── WorkflowTemplateBuilder.tsx
│   └── WorkflowTemplateList.tsx
├── routes
│   ├── AdminRoute.tsx
│   ├── FeaturesRoute.tsx
│   ├── PaidRoute.tsx
│   ├── ProtectedRoute.tsx
│   ├── ROUTING_RULES.md
│   └── workspaceRoutes.ts
├── services
│   ├── adminApi.ts
│   ├── aiService.ts
│   ├── api.ts
│   ├── auth.interceptor.ts
│   ├── billingApi.ts
│   ├── enterpriseAuth.service.ts
│   ├── enterpriseErrorHandler.ts
│   ├── onboardingApi.ts
│   ├── projectService.ts
│   ├── resourceService.ts
│   ├── taskService.ts
│   ├── templates.api.ts
│   └── workflowService.ts
├── state
│   ├── aiPanel.ts
│   ├── AuthContext.tsx
│   └── workspace.store.ts
├── stores
│   ├── authStore.ts
│   ├── organizationStore.ts
│   ├── projectStore.ts
│   ├── uiStore.ts
│   └── workspaceStore.ts
├── stories
│   ├── assets
│   │   ├── accessibility.png
│   │   ├── accessibility.svg
│   │   ├── addon-library.png
│   │   ├── assets.png
│   │   ├── avif-test-image.avif
│   │   ├── context.png
│   │   ├── discord.svg
│   │   ├── docs.png
│   │   ├── figma-plugin.png
│   │   ├── github.svg
│   │   ├── share.png
│   │   ├── styling.png
│   │   ├── testing.png
│   │   ├── theming.png
│   │   ├── tutorials.svg
│   │   └── youtube.svg
│   ├── button.css
│   ├── Button.stories.ts
│   ├── Button.tsx
│   ├── Configure.mdx
│   ├── header.css
│   ├── Header.stories.ts
│   ├── Header.tsx
│   ├── page.css
│   ├── Page.stories.ts
│   └── Page.tsx
├── styles
│   ├── App.css
│   ├── design-tokens.ts
│   ├── globals.css
│   ├── index.css
│   ├── landing.css
│   └── tokens.css
├── test
│   ├── guardrails
│   │   └── api-prefix.spec.ts
│   ├── accessibility.ts
│   ├── router-wrapper.tsx
│   ├── setup.ts
│   └── utils.tsx
├── types
│   ├── admin.ts
│   ├── api.types.ts
│   ├── document-intelligence.types.ts
│   ├── index.ts
│   ├── organization.ts
│   ├── project-initiation.types.ts
│   ├── resource.types.ts
│   ├── resources.ts
│   ├── resourceTimeline.ts
│   ├── roles.ts
│   ├── store.ts
│   ├── task.types.ts
│   └── workflow.ts
├── utils
│   ├── accessMapping.ts
│   ├── apiErrorMessage.ts
│   ├── audit.ts
│   ├── authTestRunner.ts
│   ├── constants.ts
│   ├── deployAndTest.ts
│   ├── executeAuthTests.ts
│   ├── index.ts
│   ├── resourceTimeline.ts
│   ├── roles.ts
│   ├── runAuthTests.ts
│   ├── securityTest.ts
│   ├── testAuthFlow.ts
│   ├── workspace-access-levels.ts
│   └── workspace.ts
├── views
│   ├── dashboards
│   │   ├── Builder.tsx
│   │   ├── Index.tsx
│   │   └── View.tsx
│   ├── home
│   │   ├── AdminHome.tsx
│   │   ├── GuestHome.tsx
│   │   ├── HomeEmptyState.tsx
│   │   └── MemberHome.tsx
│   ├── templates
│   │   ├── __tests__
│   │   │   └── TemplateCenter.test.tsx
│   │   └── TemplateCenter.tsx
│   ├── work-management
│   │   ├── __tests__
│   │   │   └── ProjectPlanView.test.tsx
│   │   └── ProjectPlanView.tsx
│   ├── workspaces
│   │   ├── __tests__
│   │   │   └── JoinWorkspacePage.test.tsx
│   │   ├── JoinWorkspacePage.tsx
│   │   ├── LegacyWorkspaceIdRedirect.tsx
│   │   ├── WorkspaceHomeBySlug.tsx
│   │   ├── WorkspacesIndexPage.tsx
│   │   ├── WorkspaceSlugRedirect.tsx
│   │   └── WorkspaceView.tsx
│   └── HomeView.tsx
├── App.tsx
├── App.tsx.enterprise-backup
├── index.css
├── main.ts
├── main.tsx
├── test.tsx
└── vite-env.d.ts
```
