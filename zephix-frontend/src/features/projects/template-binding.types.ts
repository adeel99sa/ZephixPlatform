/**
 * Prompt 5 / v5: Template binding + delta review (aligned with backend entities).
 */

import type { Project } from './types';

export type TemplateSyncStatus = 'IN_SYNC' | 'OUT_OF_SYNC';

export type TemplateDeltaReviewStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PARTIALLY_ACCEPTED'
  | 'REJECTED';

/** Mirrors `project_template_bindings` (camelCase JSON from API). */
export interface ProjectTemplateBinding {
  id: string;
  organizationId: string;
  projectId: string;
  templateId: string;
  boundVersionId: string;
  latestAvailableVersionId: string;
  syncStatus: TemplateSyncStatus;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors `template_delta_reviews`. */
export interface TemplateDeltaReview {
  id: string;
  organizationId: string;
  projectId: string;
  projectTemplateBindingId: string | null;
  status: TemplateDeltaReviewStatus;
  computedDelta: Record<string, unknown>;
  resolvedDelta: Record<string, unknown> | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PATCH /projects/:id/template-binding/resolve */
export interface ResolveTemplateBindingPayload {
  action: 'ACCEPT' | 'REJECT';
  review_id: string;
}

/** `{ data: { project, review } }` inner shape */
export interface ResolveTemplateBindingResult {
  project: Project;
  review: TemplateDeltaReview;
}

/** GET /projects/archive paginated payload */
export interface ArchivedProjectsPage {
  projects: Project[];
  total: number;
  page: number;
  totalPages: number;
}
