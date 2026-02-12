import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyDefinition } from '../entities/policy-definition.entity';
import { PolicyOverride } from '../entities/policy-override.entity';

/**
 * Policy resolution chain: Project > Workspace > Organization > System default.
 *
 * resolvePolicy returns the most specific override, falling back to the
 * system default value from policy_definitions.
 */
@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    @InjectRepository(PolicyDefinition)
    private readonly definitionRepo: Repository<PolicyDefinition>,
    @InjectRepository(PolicyOverride)
    private readonly overrideRepo: Repository<PolicyOverride>,
  ) {}

  /**
   * Resolve a policy value with hierarchical override resolution.
   *
   * @param organizationId - required tenancy scope
   * @param workspaceId - optional workspace scope
   * @param policyKey - the policy key to resolve
   * @param projectId - optional project scope (highest precedence)
   * @returns the resolved value, or null if the policy key is not defined
   */
  async resolvePolicy<T = any>(
    organizationId: string,
    workspaceId: string | null,
    policyKey: string,
    projectId?: string | null,
  ): Promise<T | null> {
    // 1. Try project-level override
    if (projectId && workspaceId) {
      const projectOverride = await this.overrideRepo.findOne({
        where: {
          policyKey,
          organizationId,
          workspaceId,
          projectId,
        },
      });
      if (projectOverride) {
        return this.parseValue<T>(projectOverride.value);
      }
    }

    // 2. Try workspace-level override
    if (workspaceId) {
      const wsOverride = await this.overrideRepo.findOne({
        where: {
          policyKey,
          organizationId,
          workspaceId,
          projectId: null as any,
        },
      });
      if (wsOverride) {
        return this.parseValue<T>(wsOverride.value);
      }
    }

    // 3. Try org-level override
    const orgOverride = await this.overrideRepo.findOne({
      where: {
        policyKey,
        organizationId,
        workspaceId: null as any,
        projectId: null as any,
      },
    });
    if (orgOverride) {
      return this.parseValue<T>(orgOverride.value);
    }

    // 4. Fall back to system default
    const definition = await this.definitionRepo.findOne({
      where: { key: policyKey },
    });
    if (!definition) {
      this.logger.warn(`Policy key "${policyKey}" not found in definitions`);
      return null;
    }

    return this.parseValue<T>(definition.defaultValue);
  }

  /**
   * Resolve multiple policies at once.
   */
  async resolvePolicies(
    organizationId: string,
    workspaceId: string | null,
    policyKeys: string[],
    projectId?: string | null,
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    await Promise.all(
      policyKeys.map(async (key) => {
        result[key] = await this.resolvePolicy(organizationId, workspaceId, key, projectId);
      }),
    );
    return result;
  }

  private parseValue<T>(value: any): T {
    // JSONB values are already parsed by PostgreSQL driver
    return value as T;
  }
}
