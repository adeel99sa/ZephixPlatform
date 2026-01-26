import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { Template } from '../entities/template.entity';
import { ProjectTemplate } from '../entities/project-template.entity';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import {
  WorkTypeTag,
  ScopeTag,
  ComplexityBucket,
  SetupTimeBucket,
  RecommendationReasonCode,
  REASON_LABELS,
  SETUP_TIME_LABELS,
} from '../enums/template.enums';

export interface RecommendationQuery {
  containerType: 'PROJECT' | 'PROGRAM';
  workType: WorkTypeTag;
  durationDays?: number;
  complexity?: ComplexityBucket;
}

export interface TemplateCard {
  templateId: string;
  templateName: string;
  containerType: 'PROJECT' | 'PROGRAM';
  workTypeTags: string[];
  scopeTags: string[];
  phaseCount: number;
  taskCount: number;
  lockSummary: string;
  setupTimeLabel: string;
  reasonCodes: string[];
  reasonLabels: string[];
}

export interface RecommendationResponse {
  recommended: TemplateCard[];
  others: TemplateCard[];
  inputsEcho: RecommendationQuery;
  generatedAt: string;
}

interface ScoredTemplate {
  template: Template | ProjectTemplate;
  score: number;
  workTypeMatchCount: number;
  setupTimeBucket: SetupTimeBucket;
  phaseCount: number;
  taskCount: number;
}

@Injectable()
export class TemplatesRecommendationService {
  private readonly logger = new Logger(TemplatesRecommendationService.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(Template))
    private readonly templateRepo: TenantAwareRepository<Template>,
    @Inject(getTenantAwareRepositoryToken(ProjectTemplate))
    private readonly projectTemplateRepo: TenantAwareRepository<ProjectTemplate>,
    private readonly tenantContext: TenantContextService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get template recommendations with deterministic scoring
   * Locked contract: No popularity, no personalization, no userId input
   */
  async getRecommendations(
    query: RecommendationQuery,
    organizationId: string,
    workspaceId?: string,
  ): Promise<RecommendationResponse> {
    // Debug logging
    if (process.env.E2E_DEBUG) {
      console.log(
        `[getRecommendations] organizationId: ${organizationId}, workspaceId: ${workspaceId}`,
      );
      console.log(
        `[getRecommendations] Tenant context orgId BEFORE runWithTenant: ${this.tenantContext.getOrganizationId()}`,
      );
    }

    // Set tenant context for TenantAwareRepository
    return await this.tenantContext.runWithTenant(
      { organizationId, workspaceId },
      async () => {
        if (process.env.E2E_DEBUG) {
          console.log(
            `[getRecommendations] Inside tenant context - orgId: ${this.tenantContext.getOrganizationId()}`,
          );
          console.log(
            `[getRecommendations] About to call loadV51CompatibleTemplates`,
          );
        }

        try {
          // Load candidate templates - only v5_1 compatible (has structure.phases)
          const templates = await this.loadV51CompatibleTemplates(
            organizationId,
            workspaceId,
          );

          if (process.env.E2E_DEBUG) {
            console.log(
              `[getRecommendations] Loaded ${templates.length} compatible templates`,
            );
          }

          // Compute counts and scores
          const scored = templates.map((template) =>
            this.scoreTemplate(template, query),
          );

          // Apply tie breakers and sort
          scored.sort((a, b) => {
            // Primary: score descending
            if (b.score !== a.score) {
              return b.score - a.score;
            }
            // Tie breaker 1: Higher workType match count
            if (b.workTypeMatchCount !== a.workTypeMatchCount) {
              return b.workTypeMatchCount - a.workTypeMatchCount;
            }
            // Tie breaker 2: Lower setupTime bucket (SHORT < MEDIUM < LONGER)
            const setupOrder = {
              [SetupTimeBucket.SHORT]: 0,
              [SetupTimeBucket.MEDIUM]: 1,
              [SetupTimeBucket.LONGER]: 2,
            };
            if (
              setupOrder[b.setupTimeBucket] !== setupOrder[a.setupTimeBucket]
            ) {
              return (
                setupOrder[a.setupTimeBucket] - setupOrder[b.setupTimeBucket]
              );
            }
            // Tie breaker 3: templateName alphabetical
            const nameA = this.getTemplateName(a.template);
            const nameB = this.getTemplateName(b.template);
            return nameA.localeCompare(nameB);
          });

          // Build reason codes and labels
          const cards = scored.map((scored) =>
            this.buildTemplateCard(scored, query),
          );

          // Split: top 3 to recommended, next 12 to others
          const recommended = cards.slice(0, 3);
          const others = cards.slice(3, 15); // Max 12 in others

          return {
            recommended,
            others,
            inputsEcho: query,
            generatedAt: new Date().toISOString(),
          };
        } catch (error: any) {
          if (process.env.E2E_DEBUG) {
            console.log(
              `[getRecommendations] Error in tenant context: ${error.message}`,
              error.stack,
            );
          }
          throw error;
        }
      },
    );
  }

  /**
   * Load templates compatible with v5_1 structure
   * Only templates with structure.phases array are included
   */
  private async loadV51CompatibleTemplates(
    organizationId: string,
    workspaceId?: string,
  ): Promise<(Template | ProjectTemplate)[]> {
    // Load from ProjectTemplate entity using TenantAwareRepository
    // TenantAwareRepository automatically scopes by organizationId
    let projectTemplates: ProjectTemplate[];
    try {
      // Use TenantAwareRepository query builder - automatically scoped by organizationId
      // TenantAwareRepository automatically adds organizationId filter
      const queryBuilder = this.projectTemplateRepo
        .qb('pt')
        .where('pt.isActive = :isActive', { isActive: true });

      projectTemplates = await queryBuilder.getMany();
    } catch (error: any) {
      // If query fails (e.g., structure column doesn't exist), fall back to simpler query
      if (
        error.message &&
        error.message.includes('column') &&
        error.message.includes('structure')
      ) {
        const queryBuilder = this.projectTemplateRepo
          .qb('pt')
          .where('pt.isActive = :isActive', { isActive: true });

        projectTemplates = await queryBuilder.getMany();
      } else {
        // Re-throw if it's a different error
        throw error;
      }
    }

    // Map ProjectTemplate entities - ensure structure exists
    // Note: template.phases (Phase[]) is incompatible with structure.phases (requires tasks array)
    // So we only use structure if it exists, otherwise create empty structure
    const projectTemplatesMapped = projectTemplates.map((template) => {
      if (!template.structure) {
        template.structure = { phases: [] };
      }
      return template;
    });

    // Also load from Template entity if needed
    // Skip Template entity for now - focus on ProjectTemplate which is the primary source for v5_1
    // Templates from Template entity are legacy and may not have v5_1 structure
    const templates: Template[] = [];

    // Filter for v5_1 compatible structure
    const compatible: (Template | ProjectTemplate)[] = [];

    for (const template of templates) {
      if (this.isV51Compatible(template)) {
        compatible.push(template);
      }
    }

    for (const template of projectTemplatesMapped) {
      if (this.isV51Compatible(template)) {
        compatible.push(template);
      }
    }

    return compatible;
  }

  /**
   * Check if template has v5_1 compatible structure
   */
  private isV51Compatible(template: Template | ProjectTemplate): boolean {
    try {
      if (!template.structure || typeof template.structure !== 'object') {
        if (process.env.E2E_DEBUG) {
          console.log(
            `[isV51Compatible] Template ${template.id} has no structure or structure is not object`,
          );
        }
        return false;
      }
      const structure = template.structure as any;
      const hasPhases =
        Array.isArray(structure.phases) && structure.phases.length > 0;

      if (process.env.E2E_DEBUG && !hasPhases) {
        console.log(
          `[isV51Compatible] Template ${template.id} structure.phases is not array or empty`,
        );
      }

      return hasPhases;
    } catch (error: any) {
      if (process.env.E2E_DEBUG) {
        console.log(
          `[isV51Compatible] Error checking template ${template.id}: ${error.message}`,
        );
      }
      return false; // Skip invalid templates instead of throwing
    }
  }

  /**
   * Score template based on query parameters
   * Scoring rules:
   * - workType match: +100
   * - containerType match: +60
   * - scope tag matches containerType: +40
   * - complexity provided and matches: +20
   * - durationDays provided and within range: +10
   */
  private scoreTemplate(
    template: Template | ProjectTemplate,
    query: RecommendationQuery,
  ): ScoredTemplate {
    let score = 0;
    let workTypeMatchCount = 0;

    // Get template metadata
    const workTypeTags = this.getWorkTypeTags(template);
    const scopeTags = this.getScopeTags(template);
    const complexityBucket = this.getComplexityBucket(template);
    const durationRange = this.getDurationRange(template);
    const setupTimeBucket = this.getSetupTimeBucket(template);

    // workType match: +100 per match
    if (workTypeTags.includes(query.workType)) {
      score += 100;
      workTypeMatchCount = 1;
    }

    // containerType match: +60
    // For now, assume all templates are PROJECT type (containerType not stored yet)
    // This will be enhanced when containerType is added to template metadata
    // score += 60; // Placeholder

    // scope tag matches containerType: +40
    const expectedScopeTag =
      query.containerType === 'PROJECT'
        ? ScopeTag.SINGLE_PROJECT
        : ScopeTag.MULTI_PROJECT;
    if (scopeTags.includes(expectedScopeTag)) {
      score += 40;
    }

    // complexity provided and matches: +20
    if (query.complexity && complexityBucket === query.complexity) {
      score += 20;
    }

    // durationDays provided and within range: +10
    if (query.durationDays && durationRange) {
      const { min, max } = durationRange;
      if (min && query.durationDays < min) {
        // Too short, no bonus
      } else if (max && query.durationDays > max) {
        // Too long, no bonus
      } else {
        score += 10;
      }
    }

    // Compute phase and task counts
    const { phaseCount, taskCount } = this.computeCounts(template);

    return {
      template,
      score,
      workTypeMatchCount,
      setupTimeBucket,
      phaseCount,
      taskCount,
    };
  }

  /**
   * Build TemplateCard with reason codes and labels
   */
  private buildTemplateCard(
    scored: ScoredTemplate,
    query: RecommendationQuery,
  ): TemplateCard {
    const template = scored.template;
    const workTypeTags = this.getWorkTypeTags(template);
    const scopeTags = this.getScopeTags(template);
    const setupTimeBucket = scored.setupTimeBucket;

    // Build reason codes (max 2)
    const reasonCodes: RecommendationReasonCode[] = [];
    const reasonLabels: string[] = [];

    // Priority order for reasons:
    // 1. MATCH_WORK_TYPE if matched
    if (workTypeTags.includes(query.workType)) {
      reasonCodes.push(RecommendationReasonCode.MATCH_WORK_TYPE);
      reasonLabels.push(
        REASON_LABELS[RecommendationReasonCode.MATCH_WORK_TYPE],
      );
    }

    // 2. MATCH_SCOPE if matched
    const expectedScopeTag =
      query.containerType === 'PROJECT'
        ? ScopeTag.SINGLE_PROJECT
        : ScopeTag.MULTI_PROJECT;
    if (scopeTags.includes(expectedScopeTag) && reasonCodes.length < 2) {
      reasonCodes.push(RecommendationReasonCode.MATCH_SCOPE);
      reasonLabels.push(REASON_LABELS[RecommendationReasonCode.MATCH_SCOPE]);
    }

    // 3. INCLUDES_CUTOVER if present (check structure for milestone phases)
    if (reasonCodes.length < 2 && this.hasCutoverMilestone(template)) {
      reasonCodes.push(RecommendationReasonCode.INCLUDES_CUTOVER);
      reasonLabels.push(
        REASON_LABELS[RecommendationReasonCode.INCLUDES_CUTOVER],
      );
    }

    // 4. INCLUDES_INTEGRATIONS if present (check structure or tags)
    if (reasonCodes.length < 2 && this.hasIntegrations(template)) {
      reasonCodes.push(RecommendationReasonCode.INCLUDES_INTEGRATIONS);
      reasonLabels.push(
        REASON_LABELS[RecommendationReasonCode.INCLUDES_INTEGRATIONS],
      );
    }

    // 5. LOW_SETUP if setup bucket is SHORT
    if (reasonCodes.length < 2 && setupTimeBucket === SetupTimeBucket.SHORT) {
      reasonCodes.push(RecommendationReasonCode.LOW_SETUP);
      reasonLabels.push(REASON_LABELS[RecommendationReasonCode.LOW_SETUP]);
    }

    // Build lock summary (one line) - Sprint 4 hardening: exact sentence everywhere
    // Phase 5.1: All templates use the same lock summary sentence
    const lockSummary = 'Structure locks when work starts';

    return {
      templateId: template.id,
      templateName: this.getTemplateName(template),
      containerType: query.containerType, // For now, echo query. Later: read from template
      workTypeTags,
      scopeTags,
      phaseCount: scored.phaseCount,
      taskCount: scored.taskCount,
      lockSummary,
      setupTimeLabel: SETUP_TIME_LABELS[setupTimeBucket],
      reasonCodes: reasonCodes.slice(0, 2),
      reasonLabels: reasonLabels.slice(0, 2),
    };
  }

  // Helper methods to extract template metadata
  private getWorkTypeTags(template: Template | ProjectTemplate): string[] {
    if ('workTypeTags' in template && Array.isArray(template.workTypeTags)) {
      return template.workTypeTags;
    }
    return [];
  }

  private getScopeTags(template: Template | ProjectTemplate): string[] {
    if ('scopeTags' in template && Array.isArray(template.scopeTags)) {
      return template.scopeTags;
    }
    return [];
  }

  private getComplexityBucket(
    template: Template | ProjectTemplate,
  ): ComplexityBucket | undefined {
    if ('complexityBucket' in template && template.complexityBucket) {
      return template.complexityBucket as ComplexityBucket;
    }
    return undefined;
  }

  private getDurationRange(
    template: Template | ProjectTemplate,
  ): { min?: number; max?: number } | null {
    if ('durationMinDays' in template || 'durationMaxDays' in template) {
      return {
        min:
          'durationMinDays' in template ? template.durationMinDays : undefined,
        max:
          'durationMaxDays' in template ? template.durationMaxDays : undefined,
      };
    }
    return null;
  }

  private getSetupTimeBucket(
    template: Template | ProjectTemplate,
  ): SetupTimeBucket {
    if ('setupTimeBucket' in template && template.setupTimeBucket) {
      return template.setupTimeBucket as SetupTimeBucket;
    }
    return SetupTimeBucket.SHORT; // Default
  }

  private getLockPolicy(
    template: Template | ProjectTemplate,
  ): { structureLocksOnStart: boolean; lockedItems: string[] } | null {
    if ('lockPolicy' in template && template.lockPolicy) {
      return template.lockPolicy as any;
    }
    // Default Phase 5.1 policy
    return {
      structureLocksOnStart: true,
      lockedItems: ['phaseOrder', 'phaseCount', 'reportingKeys'],
    };
  }

  private getTemplateName(template: Template | ProjectTemplate): string {
    return template.name || 'Untitled Template';
  }

  private computeCounts(template: Template | ProjectTemplate): {
    phaseCount: number;
    taskCount: number;
  } {
    if (!template.structure || typeof template.structure !== 'object') {
      return { phaseCount: 0, taskCount: 0 };
    }

    const structure = template.structure as any;
    if (!Array.isArray(structure.phases)) {
      return { phaseCount: 0, taskCount: 0 };
    }

    const phaseCount = structure.phases.length;
    const taskCount = structure.phases.reduce((sum: number, phase: any) => {
      return sum + (Array.isArray(phase.tasks) ? phase.tasks.length : 0);
    }, 0);

    return { phaseCount, taskCount };
  }

  private hasCutoverMilestone(template: Template | ProjectTemplate): boolean {
    if (!template.structure || typeof template.structure !== 'object') {
      return false;
    }
    const structure = template.structure as any;
    if (!Array.isArray(structure.phases)) {
      return false;
    }
    return structure.phases.some(
      (phase: any) => phase.isMilestone === true || phase.milestone === true,
    );
  }

  private hasIntegrations(template: Template | ProjectTemplate): boolean {
    // Check if template has integration-related tags or structure
    const workTypeTags = this.getWorkTypeTags(template);
    return workTypeTags.includes(WorkTypeTag.INTEGRATION);
  }
}
