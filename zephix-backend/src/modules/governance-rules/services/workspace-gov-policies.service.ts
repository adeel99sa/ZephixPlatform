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
  POLICY_WHEN_TEXT,
  NON_EVALUABLE_REASON,
  getPolicyParams,
  BundleKey,
  normalizeBundleKey,
  isPolicyEvaluable,
  validatePolicyParams,
  coercePolicyParam,
} from '../constants/policy-bundle.constants';
import type {
  PolicyView,
  PolicyReleaseView,
  PolicyWhenParam,
  PolicyState,
} from '../dto/workspace-gov-policies.dto';

/**
 * Unit 5: the platform default approval step is a single ANY_ONE ADMIN step
 * (see GateApprovalChainService.DEFAULT_STEP_ROLE / the BackfillDefaultApproval
 * migration). We never hardcode this into a release — release is READ from the
 * live gate_approval_chain_steps rows. This constant only labels the "no custom
 * chain provisioned" case in resolveReleaseForCodes.
 */
interface ChainStepRow {
  gate_key: string;
  required_role: string | null;
  min_approvals: number | string;
  approval_type: string;
}
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
      select: ['id', 'name', 'complexityMode'],
    });
    const bundleKey = normalizeBundleKey(ws?.complexityMode ?? null);

    const rows = await this.repo.find({
      where: { organizationId, workspaceId },
    });
    const rowByCode = new Map(rows.map((r) => [r.policyCode, r]));

    // Release (who can release a blocked gate) is only meaningful for policies
    // that resolve to BLOCK under this mode. Resolve those in ONE grouped query.
    const blockCodes = W2_POLICY_CODES.filter((code) => {
      const row = rowByCode.get(code) ?? null;
      return this.resolveVerdict(code, row, bundleKey) === 'BLOCK';
    });
    const releaseByCode = await this.resolveReleaseForCodes(
      organizationId,
      workspaceId,
      blockCodes,
    );

    return W2_POLICY_CODES.map((code) =>
      this.buildView(code, rowByCode.get(code) ?? null, bundleKey, {
        workspaceName: ws?.name ?? null,
        release: releaseByCode.get(code) ?? null,
      }),
    );
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
      select: ['id', 'name', 'complexityMode'],
    });
    const bundleKey = normalizeBundleKey(ws?.complexityMode ?? null);
    const verdict = this.resolveVerdict(
      policyCode as W2PolicyCode,
      saved,
      bundleKey,
    );
    const release =
      verdict === 'BLOCK'
        ? (
            await this.resolveReleaseForCodes(organizationId, workspaceId, [
              policyCode as W2PolicyCode,
            ])
          ).get(policyCode as W2PolicyCode) ?? null
        : null;
    return this.buildView(policyCode as W2PolicyCode, saved, bundleKey, {
      workspaceName: ws?.name ?? null,
      release,
    });
  }

  // ── private ─────────────────────────────────────────────────────────────────

  /** Enabled/source resolution — single source used by buildView + resolveVerdict. */
  private resolveEnabled(
    code: W2PolicyCode,
    row: WorkspaceGovPolicy | null,
    bundleKey: BundleKey | null,
  ): { isEnabled: boolean; source: PolicyView['source'] } {
    const meta = POLICY_META[code];
    if (row !== null) return { isEnabled: row.isEnabled, source: 'workspace' };
    if (bundleKey && meta.bundleDefaults[bundleKey])
      return { isEnabled: true, source: 'bundle' };
    return { isEnabled: false, source: 'disabled' };
  }

  /** severityEffective resolved for the workspace mode (the contract `verdict`). */
  private resolveVerdict(
    code: W2PolicyCode,
    row: WorkspaceGovPolicy | null,
    bundleKey: BundleKey | null,
  ): PolicyView['severityEffective'] {
    const { isEnabled } = this.resolveEnabled(code, row, bundleKey);
    if (!isEnabled || !bundleKey) return null;
    return POLICY_META[code].bundleSeverity[bundleKey] ?? null;
  }

  /**
   * Unit 5: resolve `release` for the given BLOCK policy codes by READING the
   * live gate approval chain (never hardcoding a role). One grouped query over
   * this workspace's active chains; a code with no provisioned chain gets no
   * entry (release stays null — an honest "no approval chain here yet", not a
   * fabricated ADMIN). Roles are aggregated across the code's gate defs; if they
   * diverge the label says so rather than picking one silently.
   */
  private async resolveReleaseForCodes(
    organizationId: string,
    workspaceId: string,
    codes: string[],
  ): Promise<Map<string, PolicyReleaseView>> {
    const out = new Map<string, PolicyReleaseView>();
    if (codes.length === 0) return out;

    let rows: ChainStepRow[] = [];
    try {
      rows = await this.repo.manager.query(
        `SELECT d.gate_key                AS gate_key,
                s.required_role           AS required_role,
                s.min_approvals           AS min_approvals,
                s.approval_type           AS approval_type
           FROM phase_gate_definitions d
           JOIN gate_approval_chains c
             ON c.gate_definition_id = d.id
            AND c.is_active = true
            AND c.deleted_at IS NULL
           JOIN gate_approval_chain_steps s
             ON s.chain_id = c.id
          WHERE d.organization_id = $1
            AND d.workspace_id = $2
            AND d.deleted_at IS NULL
            AND d.gate_key = ANY($3)
          ORDER BY d.gate_key, s.step_order ASC`,
        [organizationId, workspaceId, codes],
      );
    } catch (err) {
      // Loud, not silent — a failed release read must not masquerade as "no
      // approval chain". Callers get an empty map (release null) + this WARN.
      this.logger.warn(
        `[RELEASE_CHAIN_READ_FAILED] Could not resolve approval chains for ` +
          `workspace ${workspaceId}; release will be null for BLOCK policies.`,
        err as Error,
      );
      return out;
    }

    const byCode = new Map<string, ChainStepRow[]>();
    for (const r of rows) {
      const list = byCode.get(r.gate_key) ?? [];
      list.push(r);
      byCode.set(r.gate_key, list);
    }

    for (const [code, stepRows] of byCode.entries()) {
      const roles = Array.from(
        new Set(stepRows.map((r) => r.required_role).filter((x): x is string => !!x)),
      );
      // Total approvals required = one per step (ANY_ONE) or its min_approvals (ALL).
      const approvalsRequired = stepRows.reduce((sum, r) => {
        const min = Number(r.min_approvals) || 1;
        return sum + (r.approval_type === 'ALL' ? min : 1);
      }, 0);
      const requiredRole =
        roles.length === 0 ? 'ADMIN' : roles.length === 1 ? roles[0] : 'MULTIPLE';
      const label =
        roles.length <= 1
          ? `Requires ${approvalsRequired} approval(s) from ${requiredRole}`
          : `Requires approval from multiple roles (${roles.join(', ')})`;
      out.set(code, { requiredRole, approvalsRequired, label });
    }
    return out;
  }

  /** Compose the server-side "When" sentence, interpolating a threshold value. */
  private composeWhenText(
    code: W2PolicyCode,
    effectiveValue: number | null,
    unit: string | null,
  ): string | null {
    const template = POLICY_WHEN_TEXT[code] ?? null;
    if (template === null) return null;
    return template
      .replace('{value}', effectiveValue === null ? '' : String(effectiveValue))
      .replace('{unit}', unit ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildView(
    code: W2PolicyCode,
    row: WorkspaceGovPolicy | null,
    bundleKey: BundleKey | null,
    ctx: { workspaceName: string | null; release: PolicyReleaseView | null },
  ): PolicyView {
    const meta = POLICY_META[code];
    const { isEnabled, source } = this.resolveEnabled(code, row, bundleKey);

    const severityEffective: PolicyView['severityEffective'] =
      isEnabled && bundleKey ? meta.bundleSeverity[bundleKey] ?? null : null;
    const isEvaluable = isPolicyEvaluable(code);

    // Three-state field (5.3). NOT_EVALUABLE (our gap) is never conflated with
    // DISABLED (their choice).
    let state: PolicyState;
    let stateReason: string | null;
    if (!isEvaluable) {
      state = 'NOT_EVALUABLE';
      stateReason = NON_EVALUABLE_REASON[code] ?? 'Cannot be evaluated';
    } else if (!isEnabled) {
      state = 'DISABLED';
      stateReason =
        source === 'workspace'
          ? 'Turned off by your admin'
          : `Not enabled by the ${bundleKey ?? 'current'} complexity bundle`;
    } else {
      state = 'ENFORCING';
      stateReason = null;
    }

    // when.params — effective value (row param ?? declared default). editable is
    // aligned with evaluability: NOT_EVALUABLE ⇒ editable:false always.
    const whenParams: PolicyWhenParam[] = getPolicyParams(code).map((p) => {
      const stored = row?.params?.[p.key];
      const value =
        typeof stored === 'number' || typeof stored === 'string'
          ? stored
          : p.default;
      return {
        key: p.key,
        label: p.label,
        value,
        unit: p.unit,
        editable: isEvaluable && p.readAtDecisionTime,
        min: p.min,
        max: p.max,
      };
    });

    const firstParam = whenParams[0];
    const whenText = this.composeWhenText(
      code,
      firstParam ? Number(firstParam.value) : null,
      firstParam ? firstParam.unit : null,
    );

    return {
      code,
      name: meta.name,

      when: { text: whenText, params: whenParams },
      scope: {
        tier: 'workspace',
        label: `Workspace — ${ctx.workspaceName ?? 'Unknown'}`,
      },
      verdict: severityEffective,
      release: severityEffective === 'BLOCK' ? ctx.release : null,
      state,
      stateReason,

      humanLabel: meta.name,
      description: meta.description,
      enforcementScope: meta.scope,
      enforcementPoint: POLICY_ENFORCEMENT_POINT[code],
      outcome: severityEffective,
      severityEffective,
      source,
      enabled: isEnabled,
      isEnabled,
      // Honesty primitive — false for the non-evaluable promotions. Never faked.
      isEvaluable,
      params: row?.params ?? null,
      bundleDefaults: meta.bundleDefaults,
    };
  }
}
