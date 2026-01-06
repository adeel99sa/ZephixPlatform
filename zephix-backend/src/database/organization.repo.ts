/**
 * Infrastructure wrapper for Organization repository access
 *
 * This is an infrastructure-level module that provides safe access to the
 * Organization entity, which is a global boundary entity (not tenant-scoped).
 *
 * This wrapper is excluded from tenancy bypass guardrails because:
 * 1. Organization defines the tenant boundary itself
 * 2. This is infrastructure-level code, not feature code
 * 3. Organization is explicitly allowed in ACCEPTABLE_INJECT_REPOSITORY_EXCEPTIONS.md
 *
 * Usage:
 * ```typescript
 * import { getOrganizationRepository } from '../database/organization.repo';
 *
 * const orgRepo = getOrganizationRepository(dataSource);
 * const org = await orgRepo.findOne({ where: { id } });
 * ```
 */

import { DataSource, Repository } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';

/**
 * Get Organization repository from DataSource
 * This is infrastructure-level access to a global entity
 */
export function getOrganizationRepository(
  dataSource: DataSource,
): Repository<Organization> {
  return dataSource.getRepository(Organization);
}

