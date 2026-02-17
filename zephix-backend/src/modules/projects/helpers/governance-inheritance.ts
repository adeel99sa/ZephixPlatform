import { Portfolio } from '../../portfolios/entities/portfolio.entity';
import { Project } from '../entities/project.entity';

export type GovernanceSource = 'USER' | 'TEMPLATE' | 'PORTFOLIO' | 'LEGACY';

const GOV_FLAG_KEYS = [
  'costTrackingEnabled',
  'baselinesEnabled',
  'iterationsEnabled',
  'changeManagementEnabled',
] as const;

type GovFlagKey = (typeof GOV_FLAG_KEYS)[number];

interface ApplyOptions {
  force?: boolean;
  onlyIfUnset?: boolean;
}

/**
 * Wave 8B: Apply portfolio governance defaults to a project.
 *
 * Rules:
 * - If force=true, always overwrite project flags and set source=PORTFOLIO.
 * - If onlyIfUnset=true, only set flags when project.governanceSource is null (LEGACY).
 * - Default: apply portfolio flags and set source=PORTFOLIO.
 *
 * Returns true if flags were applied, false if skipped.
 */
export function applyPortfolioGovernanceDefaults(
  project: Partial<Project>,
  portfolio: Portfolio,
  options: ApplyOptions = {},
): boolean {
  const { force = false, onlyIfUnset = false } = options;

  if (onlyIfUnset && project.governanceSource != null) {
    return false;
  }

  if (
    !force &&
    project.governanceSource != null &&
    project.governanceSource !== 'LEGACY'
  ) {
    return false;
  }

  for (const key of GOV_FLAG_KEYS) {
    (project as any)[key] = portfolio[key];
  }
  project.governanceSource = 'PORTFOLIO';

  return true;
}

/**
 * Determines if explicit governance flags were provided in a DTO payload.
 * Returns true if any of the 4 governance flags are present (not undefined).
 */
export function hasExplicitGovernanceFlags(
  payload: Record<string, any>,
): boolean {
  return GOV_FLAG_KEYS.some((key) => payload[key] !== undefined);
}

export { GOV_FLAG_KEYS };
