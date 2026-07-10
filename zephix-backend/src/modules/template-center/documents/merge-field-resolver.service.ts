/**
 * TC-B6 — Merge field resolver.
 *
 * Resolves a fixed, deterministic set of merge tokens ONCE at document-instance
 * creation from live project data. There is no engine, no inference, no async
 * model call — pure data substitution so the same project always yields the
 * same resolved content.
 *
 * Supported tokens:
 *   {{project.name}}    — project name
 *   {{project.manager}} — project manager display name
 *   {{project.phase}}   — current (lowest sort_order) phase name
 *   {{project.health}}  — health label derived from risk level
 *   {{team}}            — comma-joined team member display names (incl. PM)
 *   {{milestones}}      — comma-joined milestone phase names
 *
 * Contract: a token whose value cannot be resolved is LEFT as its literal
 * token in the output and reported in `unresolvedFields`. It is never blanked
 * or guessed.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, EntityManager } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { WorkPhase } from '../../work-management/entities/work-phase.entity';

export const MERGE_TOKENS = [
  '{{project.name}}',
  '{{project.manager}}',
  '{{project.phase}}',
  '{{project.health}}',
  '{{team}}',
  '{{milestones}}',
] as const;

export type MergeToken = (typeof MERGE_TOKENS)[number];

/** token → resolved string, or null when it cannot be resolved. */
export type MergeTokenMap = Record<MergeToken, string | null>;

export interface MergeResolutionInputs {
  projectName: string | null;
  managerName: string | null;
  currentPhaseName: string | null;
  /** Raw risk level (e.g. 'LOW' | 'MEDIUM' | 'HIGH'); mapped to a health label. */
  riskLevel: string | null;
  teamNames: string[];
  milestoneNames: string[];
}

/** Map a project risk level to a user-facing health label. Null → null. */
export function riskLevelToHealth(riskLevel: string | null): string | null {
  if (!riskLevel) return null;
  switch (String(riskLevel).toUpperCase()) {
    case 'LOW':
      return 'On Track';
    case 'MEDIUM':
      return 'At Risk';
    case 'HIGH':
    case 'CRITICAL':
      return 'Needs Attention';
    default:
      return null;
  }
}

/**
 * Pure token-map builder. Deterministic and side-effect free — the unit tests
 * exercise this per-token.
 */
export function buildMergeTokenMap(
  inputs: MergeResolutionInputs,
): MergeTokenMap {
  const nonEmpty = (v: string | null | undefined): string | null => {
    if (v == null) return null;
    const t = String(v).trim();
    return t.length > 0 ? t : null;
  };
  const joined = (names: string[]): string | null => {
    const clean = names
      .map((n) => (n ?? '').trim())
      .filter((n) => n.length > 0);
    return clean.length > 0 ? clean.join(', ') : null;
  };

  return {
    '{{project.name}}': nonEmpty(inputs.projectName),
    '{{project.manager}}': nonEmpty(inputs.managerName),
    '{{project.phase}}': nonEmpty(inputs.currentPhaseName),
    '{{project.health}}': riskLevelToHealth(inputs.riskLevel),
    '{{team}}': joined(inputs.teamNames),
    '{{milestones}}': joined(inputs.milestoneNames),
  };
}

export interface SubstitutionResult<T> {
  content: T;
  /** Distinct tokens that appeared in the content but could not be resolved. */
  unresolvedFields: string[];
}

/**
 * Substitute merge tokens throughout any JSONB-serialisable content structure.
 * Walks strings recursively; replaces resolvable tokens, leaves unresolvable
 * tokens literal, and reports the distinct unresolved tokens encountered.
 *
 * Pure — deep-clones the input, never mutates it.
 */
export function substituteMergeTokens<T>(
  content: T,
  tokenMap: MergeTokenMap,
): SubstitutionResult<T> {
  const unresolved = new Set<string>();

  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') {
      let out = node;
      for (const token of MERGE_TOKENS) {
        if (!out.includes(token)) continue;
        const value = tokenMap[token];
        if (value == null) {
          unresolved.add(token); // present but unresolvable → keep literal
        } else {
          out = out.split(token).join(value);
        }
      }
      return out;
    }
    if (Array.isArray(node)) {
      return node.map((item) => walk(item));
    }
    if (node && typeof node === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(
        node as Record<string, unknown>,
      )) {
        result[key] = walk(val);
      }
      return result;
    }
    return node;
  };

  return {
    content: walk(content) as T,
    unresolvedFields: Array.from(unresolved),
  };
}

function userDisplayName(u: User | null | undefined): string | null {
  if (!u) return null;
  const full = [u.firstName, u.lastName]
    .map((n) => (n ?? '').trim())
    .filter((n) => n.length > 0)
    .join(' ');
  return full.length > 0 ? full : (u.email ?? null);
}

/**
 * Gather live merge inputs for a project using the supplied EntityManager.
 *
 * Taking a manager (rather than injected repos) lets the instantiate-v5_1
 * transaction resolve merge fields against phases/project rows it just wrote
 * in the SAME transaction (a manager sees its own uncommitted writes). The
 * attach path passes the default manager and sees committed data. Read-only.
 */
export async function gatherMergeInputs(
  reader: EntityManager,
  project: Project,
): Promise<MergeResolutionInputs> {
  const userRepo = reader.getRepository(User);
  const phaseRepo = reader.getRepository(WorkPhase);

  // Manager
  let managerName: string | null = null;
  if (project.projectManagerId) {
    const manager = await userRepo.findOne({
      where: { id: project.projectManagerId },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
    managerName = userDisplayName(manager);
  }

  // Phases (current = lowest sort_order; milestones = flagged phases)
  const phases = await phaseRepo.find({
    where: { projectId: project.id },
    order: { sortOrder: 'ASC' },
  });
  const currentPhaseName = phases.length > 0 ? phases[0].name : null;
  const milestoneNames = phases
    .filter((ph) => ph.isMilestone)
    .map((ph) => ph.name);

  // Team (team_member_ids + PM, de-duplicated)
  const teamIds = new Set<string>(
    Array.isArray(project.teamMemberIds) ? project.teamMemberIds : [],
  );
  if (project.projectManagerId) teamIds.add(project.projectManagerId);
  let teamNames: string[] = [];
  if (teamIds.size > 0) {
    const members = await userRepo.find({
      where: { id: In(Array.from(teamIds)) },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
    teamNames = members
      .map((m) => userDisplayName(m))
      .filter((n): n is string => !!n);
  }

  return {
    projectName: project.name ?? null,
    managerName,
    currentPhaseName,
    riskLevel: (project.riskLevel as unknown as string) ?? null,
    teamNames,
    milestoneNames,
  };
}

@Injectable()
export class MergeFieldResolverService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  /**
   * Gather the live merge inputs for a project. Read-only. Uses the default
   * connection unless an EntityManager is supplied (e.g. a transaction).
   */
  async resolveInputsForProject(
    project: Project,
    manager?: EntityManager,
  ): Promise<MergeResolutionInputs> {
    const reader = manager ?? this.projectRepo.manager;
    return gatherMergeInputs(reader, project);
  }

  /**
   * Full path: resolve inputs for the project, build the token map, and
   * substitute across the given content. Returns resolved content plus the
   * distinct tokens that could not be resolved.
   */
  async resolveContent<T>(
    project: Project,
    content: T,
    manager?: EntityManager,
  ): Promise<SubstitutionResult<T>> {
    const inputs = await this.resolveInputsForProject(project, manager);
    const tokenMap = buildMergeTokenMap(inputs);
    return substituteMergeTokens(content, tokenMap);
  }
}
