import { registerAs } from '@nestjs/config';

export interface FeatureFlags {
  // Core features (always enabled)
  auth: boolean;
  organizations: boolean;
  projects: boolean;

  // Optional features (controlled by environment)
  aiModule: boolean;
  governanceModule: boolean;
  documentProcessing: boolean;
  telemetry: boolean;
  adminPanel: boolean;
  workflows: boolean;
  workspaceMembershipV1: boolean;

  // B1 RBAC foundations: gates the new MFA challenge flow, MfaRequiredGuard
  // on sensitive admin endpoints, and the new identity controllers in PR2.
  // PR1 ships with this flag false-by-default — schema and services are
  // present but inert. Flip to true in the PR2 cutover deployment runbook.
  rbacV2Enabled: boolean;

  // B2 Tenancy & Workspace + complexity_mode: gates the cutover behaviors
  // (HTTP endpoints for complexity-mode, Programs gating in
  // ProgramsService.create, snapshot wiring, audit-action emission to DB).
  // PR1 ships dormant — Stage 1 migration is additive, services + DTOs are
  // present, but no behavior changes. Flip to true in PR2 cutover runbook.
  // ADR-B2-001..004 for context.
  b2TenancyV2Enabled: boolean;

  // Wave 10: KPI async recompute and rollup flags
  kpiAsyncRecomputeEnabled: boolean;
  kpiSchedulerEnabled: boolean;
  portfolioKpiSnapshotsEnabled: boolean;
  programKpiSnapshotsEnabled: boolean;
}

export default registerAs(
  'features',
  (): FeatureFlags => ({
    // Core features - always true
    auth: true,
    organizations: true,
    projects: true,

    // Optional features - read from environment
    aiModule: process.env.ENABLE_AI_MODULE === 'true',
    governanceModule: process.env.ENABLE_GOVERNANCE === 'true',
    documentProcessing: process.env.ENABLE_DOCUMENTS === 'true',
    telemetry: process.env.ENABLE_TELEMETRY === 'true',
    adminPanel: process.env.ENABLE_ADMIN === 'true',
    workflows: process.env.ENABLE_WORKFLOWS === 'true',
    // RBAC stabilization: Set ZEPHIX_WS_MEMBERSHIP_V1=1 in Railway staging env vars
    // to activate workspace membership guards (RequireWorkspaceRoleGuard,
    // RequireProjectWorkspaceRoleGuard). Safe to enable after guard fixes in
    // src/common/auth/ are deployed. Do NOT hard-code true here — this must
    // remain env-driven so production can be enabled separately.
    workspaceMembershipV1: process.env.ZEPHIX_WS_MEMBERSHIP_V1 === '1',
    // B1 RBAC foundations: false by default; flip to true in PR2 cutover deploy
    rbacV2Enabled: process.env.RBAC_V2_ENABLED === 'true',
    // B2 Tenancy & Workspace + complexity_mode: false by default. PR1 ships
    // dormant; flip to true via B2_TENANCY_V2_ENABLED=true in PR2 cutover.
    b2TenancyV2Enabled: process.env.B2_TENANCY_V2_ENABLED === 'true',

    // Wave 10: KPI async recompute
    kpiAsyncRecomputeEnabled: process.env.KPI_ASYNC_RECOMPUTE_ENABLED === 'true',
    kpiSchedulerEnabled: process.env.KPI_SCHEDULER_ENABLED === 'true',
    portfolioKpiSnapshotsEnabled: process.env.PORTFOLIO_KPI_SNAPSHOTS_ENABLED === 'true',
    programKpiSnapshotsEnabled: process.env.PROGRAM_KPI_SNAPSHOTS_ENABLED === 'true',
  }),
);
