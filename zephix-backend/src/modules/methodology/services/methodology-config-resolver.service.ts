import { Injectable } from '@nestjs/common';
import {
  MethodologyCode,
  MethodologyConfig,
} from '../interfaces/methodology-config.interface';
import { METHODOLOGY_PRESETS } from '../constants/methodology-presets';

/**
 * Resolves the final MethodologyConfig at project creation time.
 *
 * No runtime recalculation. No inheritance chain. The config is resolved ONCE
 * when the project is created from a template, then persisted as JSONB.
 * All subsequent reads come from the stored config.
 */
@Injectable()
export class MethodologyConfigResolverService {
  /**
   * Returns the system preset for a methodology code.
   */
  getPreset(methodologyCode: MethodologyCode): MethodologyConfig {
    const preset = METHODOLOGY_PRESETS[methodologyCode];
    if (!preset) {
      return structuredClone(METHODOLOGY_PRESETS[MethodologyCode.AGILE].config);
    }
    return structuredClone(preset.config);
  }

  /**
   * Resolves final config at creation time: starts from preset, applies overrides.
   * No locks — org admins can override any field. Data-integrity consistency
   * is enforced by the validator after resolution.
   */
  resolve(
    methodologyCode: MethodologyCode,
    overrides?: Partial<MethodologyConfig>,
  ): MethodologyConfig {
    const preset = METHODOLOGY_PRESETS[methodologyCode];
    if (!preset) {
      return this.getPreset(MethodologyCode.AGILE);
    }

    const base = structuredClone(preset.config);
    if (!overrides) return base;

    const merged = this.deepMerge(base, overrides) as MethodologyConfig;

    // Preserve identity fields — the methodology code and lifecycle type
    // come from the preset, not from overrides
    merged.lifecycleType = preset.config.lifecycleType;
    merged.methodologyCode = preset.config.methodologyCode;

    return merged;
  }

  /**
   * Builds a permissive MethodologyConfig from a project's existing governance flags.
   * Used ONLY for the one-time backfill migration of existing projects.
   */
  buildFromExistingFlags(project: {
    methodology?: string;
    iterationsEnabled?: boolean;
    costTrackingEnabled?: boolean;
    baselinesEnabled?: boolean;
    earnedValueEnabled?: boolean;
    capacityEnabled?: boolean;
    changeManagementEnabled?: boolean;
    waterfallEnabled?: boolean;
    estimationMode?: string;
    defaultIterationLengthDays?: number;
  }): MethodologyConfig {
    const code = this.normalizeMethodology(project.methodology);
    const preset = this.getPreset(code);

    preset.governance.iterationsEnabled =
      project.iterationsEnabled ?? preset.governance.iterationsEnabled;
    preset.governance.costTrackingEnabled =
      project.costTrackingEnabled ?? preset.governance.costTrackingEnabled;
    preset.governance.baselinesEnabled =
      project.baselinesEnabled ?? preset.governance.baselinesEnabled;
    preset.governance.earnedValueEnabled =
      project.earnedValueEnabled ?? preset.governance.earnedValueEnabled;
    preset.governance.capacityEnabled =
      project.capacityEnabled ?? preset.governance.capacityEnabled;
    preset.governance.changeManagementEnabled =
      project.changeManagementEnabled ??
      preset.governance.changeManagementEnabled;
    preset.governance.waterfallEnabled =
      project.waterfallEnabled ?? preset.governance.waterfallEnabled;

    preset.sprint.enabled = project.iterationsEnabled ?? preset.sprint.enabled;
    preset.sprint.defaultLengthDays =
      project.defaultIterationLengthDays ?? preset.sprint.defaultLengthDays;

    if (project.estimationMode) {
      const map: Record<string, string> = {
        story_points: 'points',
        hours: 'hours',
        both: 'both',
        none: 'none',
        points: 'points',
      };
      preset.estimation.type =
        (map[project.estimationMode] as any) ?? preset.estimation.type;
    }

    // Permissive: show all tabs for existing projects
    preset.ui.tabs = [
      'overview',
      'plan',
      'tasks',
      'board',
      'gantt',
      'sprints',
      'risks',
      'resources',
      'change-requests',
      'documents',
      'budget',
      'kpis',
    ];

    return preset;
  }

  private normalizeMethodology(
    methodology?: string,
  ): MethodologyCode {
    if (!methodology) return MethodologyCode.AGILE;
    const lower = methodology.toLowerCase().trim();
    const map: Record<string, MethodologyCode> = {
      scrum: MethodologyCode.SCRUM,
      kanban: MethodologyCode.KANBAN,
      waterfall: MethodologyCode.WATERFALL,
      hybrid: MethodologyCode.HYBRID,
      agile: MethodologyCode.AGILE,
    };
    return map[lower] ?? MethodologyCode.AGILE;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] === undefined) continue;
      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}
