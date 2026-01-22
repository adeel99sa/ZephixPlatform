/**
 * Sprint 4: Template recommendation enums
 * Locked contract - do not change without UX approval
 */

export enum WorkTypeTag {
  MIGRATION = 'MIGRATION',
  IMPLEMENTATION = 'IMPLEMENTATION',
  SYSTEM_TRANSITION = 'SYSTEM_TRANSITION',
  INTEGRATION = 'INTEGRATION',
}

export enum ScopeTag {
  SINGLE_PROJECT = 'SINGLE_PROJECT',
  MULTI_PROJECT = 'MULTI_PROJECT',
}

export enum ComplexityBucket {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum SetupTimeBucket {
  SHORT = 'SHORT',
  MEDIUM = 'MEDIUM',
  LONGER = 'LONGER',
}

/**
 * Reason codes for template recommendations
 * Locked mapping - backend returns these, frontend does not invent
 */
export enum RecommendationReasonCode {
  MATCH_WORK_TYPE = 'MATCH_WORK_TYPE',
  MATCH_SCOPE = 'MATCH_SCOPE',
  INCLUDES_CUTOVER = 'INCLUDES_CUTOVER',
  INCLUDES_INTEGRATIONS = 'INCLUDES_INTEGRATIONS',
  LOW_SETUP = 'LOW_SETUP',
}

/**
 * Reason labels mapped to codes
 * Locked contract - frontend must use these labels
 */
export const REASON_LABELS: Record<RecommendationReasonCode, string> = {
  [RecommendationReasonCode.MATCH_WORK_TYPE]: 'Matches selected work type',
  [RecommendationReasonCode.MATCH_SCOPE]: 'Fits this scope',
  [RecommendationReasonCode.INCLUDES_CUTOVER]: 'Includes cutover milestone',
  [RecommendationReasonCode.INCLUDES_INTEGRATIONS]:
    'Includes integration steps',
  [RecommendationReasonCode.LOW_SETUP]: 'Minimal setup required',
};

/**
 * Setup time labels
 */
export const SETUP_TIME_LABELS: Record<SetupTimeBucket, string> = {
  [SetupTimeBucket.SHORT]: 'Short',
  [SetupTimeBucket.MEDIUM]: 'Medium',
  [SetupTimeBucket.LONGER]: 'Longer',
};
