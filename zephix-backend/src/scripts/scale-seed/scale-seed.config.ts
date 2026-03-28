/**
 * Phase 5A: Scale seed configuration.
 *
 * CLI argument parsing and defaults. All counts are multiplied by --scale.
 */
import { scaleCount } from './scale-seed.utils';

export interface ScaleSeedConfig {
  seed: number;
  scale: number;
  orgSlug: string;
  workspaceCount: number;
  projectCount: number;
  taskCount: number;
  depCount: number;
  userCount: number;
  auditCount: number;
  attachmentsCount: number;
  days: number;
  batch: number;
  dryRun: boolean;
  strictSchema: boolean;
}

const DEFAULTS = {
  scale: 0.1,
  orgSlug: 'scale-seed',
  workspaceCount: 50,
  projectCount: 1000,
  taskCount: 100000,
  depCount: 250000,
  userCount: 500,
  auditCount: 2000000,
  attachmentsCount: 50000,
  days: 90,
  batch: 5000,
  dryRun: false,
  strictSchema: false,
};

function parseArg(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

export function parseConfig(argv: string[]): ScaleSeedConfig {
  const seedRaw = parseArg(argv, 'seed');
  if (!seedRaw) {
    throw new Error('--seed=<number> is required');
  }
  const seed = parseInt(seedRaw, 10);
  if (Number.isNaN(seed) || seed <= 0) {
    throw new Error('--seed must be a positive integer');
  }

  const scale = parseFloat(parseArg(argv, 'scale') ?? String(DEFAULTS.scale));
  const orgSlug = parseArg(argv, 'orgSlug') ?? DEFAULTS.orgSlug;
  const batch = parseInt(parseArg(argv, 'batch') ?? String(DEFAULTS.batch), 10);
  const dryRun = parseArg(argv, 'dryRun') === 'true';
  const strictSchema = parseArg(argv, 'strictSchema') === 'true';

  return {
    seed,
    scale,
    orgSlug,
    workspaceCount: scaleCount(
      parseInt(parseArg(argv, 'workspaceCount') ?? String(DEFAULTS.workspaceCount), 10),
      scale,
    ),
    projectCount: scaleCount(
      parseInt(parseArg(argv, 'projectCount') ?? String(DEFAULTS.projectCount), 10),
      scale,
    ),
    taskCount: scaleCount(
      parseInt(parseArg(argv, 'taskCount') ?? String(DEFAULTS.taskCount), 10),
      scale,
    ),
    depCount: scaleCount(
      parseInt(parseArg(argv, 'depCount') ?? String(DEFAULTS.depCount), 10),
      scale,
    ),
    userCount: scaleCount(
      parseInt(parseArg(argv, 'userCount') ?? String(DEFAULTS.userCount), 10),
      scale,
    ),
    auditCount: scaleCount(
      parseInt(parseArg(argv, 'auditCount') ?? String(DEFAULTS.auditCount), 10),
      scale,
    ),
    attachmentsCount: scaleCount(
      parseInt(parseArg(argv, 'attachmentsCount') ?? String(DEFAULTS.attachmentsCount), 10),
      scale,
    ),
    days: parseInt(parseArg(argv, 'days') ?? String(DEFAULTS.days), 10),
    batch,
    dryRun,
    strictSchema,
  };
}
