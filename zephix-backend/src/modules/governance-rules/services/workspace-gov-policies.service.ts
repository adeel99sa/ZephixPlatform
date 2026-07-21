import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Optional,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceGovPolicy } from '../entities/workspace-gov-policy.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import {
  W2_POLICY_CODES,
  W2PolicyCode,
  POLICY_META,
  POLICY_ENFORCEMENT_POINT,
  BundleKey,
  normalizeBundleKey,
  isPolicyEvaluable,
  validatePolicyParams,
  coercePolicyParam,
} from '../constants/policy-bundle.constants';
import type { PolicyView } from '../dto/workspace-gov-policies.dto';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';

/**
 * SKIP-1 (Type A): actor for the workspace-policy toggle receipt. Enabling or
 * disabling a policy is a governance state change; it previously recorded no
 * actor at all (the table had no actor column and upsertPolicy took no actor).
 */
export interface PolicyToggleActor {
  userId: string;
  platformRole: string | null | undefined;
  workspaceRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class WorkspaceGovPoliciesService {
  private readonly logger = new Logger(WorkspaceGovPoliciesService.name);

  constructor(
    @InjectRepository(WorkspaceGovPolicy)
    private readonly repo: Repository<WorkspaceGovPolicy>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  /**
   * List all 9 W2 policies with effective state for a workspace.
   * Resolution: explicit row → bundle default (from workspace.complexityMode) → DISABLED.
   */
  async listPolicies(
    organizationId: string,
    workspaceId: string,
  ): Promise<PolicyView[]> {
    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      select: ['id', 'complexityMode'],
    });
    const bundleKey = normalizeBundleKey(ws?.complexityMode ?? null);

    const rows = await this.repo.find({
      where: { organizationId, workspaceId },
    });
    const rowByCode = new Map(rows.map((r) => [r.policyCode, r]));

    return W2_POLICY_CODES.map((code) => this.buildView(code, rowByCode.get(code) ?? null, bundleKey));
  }

  /**
   * GOV-FIX-B1 (1.2): resolved-active policy count for a workspace.
   *
   * The old "Active Policies" number counted classic template-activations
   * through a broken join and read ~0. The correct number is the count of W2
   * policies effectively ENABLED — which includes bundle defaults, not just the
   * (org-wide: exactly one) explicit workspace_policies rows. `evaluableActive`
   * is the honest subset that can actually enforce (excludes the non-evaluable
   * promotions), so the UI can distinguish "enabled" from "enabled AND working".
   */
  async getPolicySummary(
    organizationId: string,
    workspaceId: string,
  ): Promise<{
    workspaceId: string;
    complexityMode: string | null;
    total: number;
    activeCount: number;
    evaluableActiveCount: number;
  }> {
    const views = await this.listPolicies(organizationId, workspaceId);
    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      select: ['id', 'complexityMode'],
    });
    const active = views.filter((v) => v.isEnabled);
    return {
      workspaceId,
      complexityMode: ws?.complexityMode ?? null,
      total: views.length,
      activeCount: active.length,
      evaluableActiveCount: active.filter((v) => v.isEvaluable).length,
    };
  }

  /**
   * Resolve a single policy for enforcement use.
   * Returns true if the policy is active for this workspace.
   */
  async isPolicyActive(
    organizationId: string,
    workspaceId: string,
    policyCode: string,
  ): Promise<boolean> {
    const row = await this.repo.findOne({
      where: { organizationId, workspaceId, policyCode },
    });
    if (row) return row.isEnabled;

    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      select: ['id', 'complexityMode'],
    });
    const bundleKey = normalizeBundleKey(ws?.complexityMode ?? null);
    if (!bundleKey) return false;

    const meta = POLICY_META[policyCode as W2PolicyCode];
    return meta?.bundleDefaults[bundleKey] ?? false;
  }

  /**
   * Unit 6: resolve a single validated numeric threshold param for enforcement
   * use. Reads the explicit workspace_policies row's params (bundle defaults
   * carry no params). Returns the validated value, or null when no row/param is
   * present — the caller then falls back to its constant (the no-op path that
   * keeps behaviour identical for all current data). A stored value that fails
   * its declared schema is treated as absent (returns null) and logged loudly;
   * the PUT validation prevents this going forward, so it only guards legacy
   * rows. Throws only on a genuine DB failure, which the caller surfaces as a
   * loud WARN with a named code (6.4 loud-on-absence).
   */
  async resolveNumericParam(
    organizationId: string,
    workspaceId: string,
    policyCode: string,
    key: string,
  ): Promise<number | null> {
    const row = await this.repo.findOne({
      where: { organizationId, workspaceId, policyCode },
      select: ['id', 'params'],
    });
    const raw = row?.params?.[key];
    if (raw === undefined || raw === null) return null;
    const res = coercePolicyParam(policyCode, key, raw);
    if (!res.ok) {
      this.logger.warn(
        `[POLICY_PARAM_STORED_INVALID] ${policyCode}.${key} holds an ` +
          `un-coercible value (${JSON.stringify(raw)}); falling back to the ` +
          `constant. ${res.message}`,
      );
      return null;
    }
    return res.value;
  }

  /**
   * Upsert a workspace policy override (enabled/disabled + optional params).
   */
  async upsertPolicy(
    organizationId: string,
    workspaceId: string,
    policyCode: string,
    isEnabled: boolean,
    actor: PolicyToggleActor,
    params?: Record<string, any>,
  ): Promise<PolicyView> {
    if (!W2_POLICY_CODES.includes(policyCode as W2PolicyCode)) {
      throw new BadRequestException(`Unknown policy code: ${policyCode}`);
    }

    // Unit 6: params are an allow-list, not free JSON. Reject unknown keys /
    // wrong types / out-of-range values with a NAMED error before persisting —
    // the `validatePermissionsConfig` precedent (a validator defined and never
    // called) must not repeat. Empty/absent params validate trivially (no-op).
    const paramCheck = validatePolicyParams(policyCode, params);
    if (!paramCheck.valid) {
      throw new BadRequestException({
        code: 'POLICY_PARAMS_INVALID',
        message: `Invalid params for policy '${policyCode}'.`,
        errors: paramCheck.errors,
      });
    }

    // SKIP-1 canon: no governance state change without an actor.
    if (actor.platformRole == null || actor.platformRole === '') {
      throw new InternalServerErrorException({
        code: 'POLICY_TOGGLE_AUDIT_ACTOR_MISSING',
        message:
          'Authenticated actor has no resolvable platform role. ' +
          'This indicates a JWT or admin guard configuration bug.',
      });
    }

    const existing = await this.repo.findOne({
      where: { organizationId, workspaceId, policyCode },
    });
    const previousEnabled: boolean | null = existing ? existing.isEnabled : null;

    let saved: WorkspaceGovPolicy;
    if (existing) {
      existing.isEnabled = isEnabled;
      existing.params = params ?? existing.params;
      existing.updatedBy = actor.userId;
      saved = await this.repo.save(existing);
    } else {
      const row = this.repo.create({
        organizationId,
        workspaceId,
        policyCode,
        isEnabled,
        params: params ?? null,
        updatedBy: actor.userId,
      });
      saved = await this.repo.save(row);
    }

    // Receipt: emit ONE audit row when the effective enable-state changed (or a
    // row was created). An idempotent re-toggle to the same value writes nothing.
    const enabledChanged = previousEnabled === null || previousEnabled !== isEnabled;
    if (enabledChanged && this.auditService) {
      await this.auditService.record({
        organizationId,
        workspaceId,
        actorUserId: actor.userId,
        actorPlatformRole: actor.platformRole,
        actorWorkspaceRole: actor.workspaceRole ?? null,
        entityType: AuditEntityType.WORKSPACE,
        entityId: workspaceId,
        action: AuditAction.GOVERNANCE_EVALUATE,
        before: { policyCode, isEnabled: previousEnabled },
        after: { policyCode, isEnabled },
        metadata: { governanceType: 'WORKSPACE_POLICY_TOGGLED', policyCode },
        ipAddress: actor.ipAddress ?? null,
        userAgent: actor.userAgent ?? null,
      });
    }

    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      select: ['id', 'complexityMode'],
    });
    const bundleKey = normalizeBundleKey(ws?.complexityMode ?? null);
    return this.buildView(policyCode as W2PolicyCode, saved, bundleKey);
  }

  // ── private ─────────────────────────────────────────────────────────────────

  private buildView(
    code: W2PolicyCode,
    row: WorkspaceGovPolicy | null,
    bundleKey: BundleKey | null,
  ): PolicyView {
    const meta = POLICY_META[code];

    let isEnabled: boolean;
    let source: PolicyView['source'];

    if (row !== null) {
      isEnabled = row.isEnabled;
      source = 'workspace';
    } else if (bundleKey && meta.bundleDefaults[bundleKey]) {
      isEnabled = true;
      source = 'bundle';
    } else {
      isEnabled = false;
      source = 'disabled';
    }

    let severityEffective: PolicyView['severityEffective'] = null;
    if (isEnabled && bundleKey) {
      severityEffective = meta.bundleSeverity[bundleKey] ?? null;
    }

    return {
      code,
      name: meta.name,
      humanLabel: meta.name,
      description: meta.description,
      scope: meta.scope,
      enforcementPoint: POLICY_ENFORCEMENT_POINT[code],
      outcome: severityEffective,
      severityEffective,
      source,
      enabled: isEnabled,
      isEnabled,
      // Honesty primitive — false for the non-evaluable promotions. Never faked.
      isEvaluable: isPolicyEvaluable(code),
      params: row?.params ?? null,
      bundleDefaults: meta.bundleDefaults,
    };
  }
}
