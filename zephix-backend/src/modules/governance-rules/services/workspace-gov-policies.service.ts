import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceGovPolicy } from '../entities/workspace-gov-policy.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import {
  W2_POLICY_CODES,
  W2PolicyCode,
  POLICY_META,
  BundleKey,
  normalizeBundleKey,
} from '../constants/policy-bundle.constants';
import type { PolicyView } from '../dto/workspace-gov-policies.dto';

@Injectable()
export class WorkspaceGovPoliciesService {
  constructor(
    @InjectRepository(WorkspaceGovPolicy)
    private readonly repo: Repository<WorkspaceGovPolicy>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
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
   * Upsert a workspace policy override (enabled/disabled + optional params).
   */
  async upsertPolicy(
    organizationId: string,
    workspaceId: string,
    policyCode: string,
    isEnabled: boolean,
    params?: Record<string, any>,
  ): Promise<PolicyView> {
    if (!W2_POLICY_CODES.includes(policyCode as W2PolicyCode)) {
      throw new BadRequestException(`Unknown policy code: ${policyCode}`);
    }

    const existing = await this.repo.findOne({
      where: { organizationId, workspaceId, policyCode },
    });

    let saved: WorkspaceGovPolicy;
    if (existing) {
      existing.isEnabled = isEnabled;
      existing.params = params ?? existing.params;
      saved = await this.repo.save(existing);
    } else {
      const row = this.repo.create({
        organizationId,
        workspaceId,
        policyCode,
        isEnabled,
        params: params ?? null,
      });
      saved = await this.repo.save(row);
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
      description: meta.description,
      scope: meta.scope,
      severityEffective,
      source,
      isEnabled,
      params: row?.params ?? null,
      bundleDefaults: meta.bundleDefaults,
    };
  }
}
