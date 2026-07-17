/**
 * Template Center UI - API Client
 * Wrappers for template CRUD operations with proper workspace scoping
 */

import { api, request } from '@/lib/api';
import { getActiveWorkspaceId } from '../../utils/workspace';
import type { TemplateOriginMetadata } from './template-origin';
import { mapTemplateDto, mapTemplateList } from './template.mapper';

// Types
export type TemplateScope = 'SYSTEM' | 'ORG' | 'WORKSPACE';

export interface TaskDto {
  title: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  sortOrder?: number;
  description?: string;
}

export interface PhaseDto {
  name: string;
  reportingKey?: string;
  sortOrder: number;
  tasks: TaskDto[];
  isMilestone?: boolean;
  dueDate?: string;
}

export interface TemplateStructureDto {
  phases: PhaseDto[];
}

/** Flat phases column shape (v1 backend storage) */
export interface FlatPhase {
  name: string;
  order: number;
  description?: string;
  estimatedDurationDays?: number;
  /** TC-B4 — canonical platform.gate.* key when this phase arms a gate. */
  gateKey?: string;
  /** Stable reporting key (e.g. INIT, PLAN) used at instantiate. */
  reportingKey?: string;
  /** TC-B6 — catalog doc keys bundled onto this phase. */
  docKeys?: string[];
  isMilestone?: boolean;
}

/** Flat task_templates column shape (v1 backend storage) */
export interface FlatTaskTemplate {
  name: string;
  phaseOrder: number;
  priority?: string;
  description?: string;
  estimatedHours?: number;
}

export interface TemplateColumnConfig {
  visibleTabs?: string[];
  defaultView?: string;
}

export interface TemplateStatusGroup {
  name: string;
  statuses: Array<{ id?: string; name: string; color?: string }>;
}

export interface TemplateDto {
  id: string;
  name: string;
  description?: string;
  category?: string;
  kind: 'project' | 'board' | 'mixed' | 'document' | 'form';
  icon?: string;
  templateScope: TemplateScope;
  workspaceId?: string;
  isDefault: boolean;
  isSystem: boolean;
  isActive: boolean;
  lockState: 'UNLOCKED' | 'LOCKED';
  version: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  methodology?: 'waterfall' | 'scrum' | 'agile' | 'kanban' | 'hybrid';
  structure?: TemplateStructureDto;
  /** Flat phases column (v1 storage) — preferred over structure for display */
  phases?: FlatPhase[];
  /** Flat task templates column (v1 storage) */
  task_templates?: FlatTaskTemplate[];
  taskTemplates?: FlatTaskTemplate[];
  defaultEnabledKPIs: string[];
  /**
   * Phase 4.6: typed origin metadata. Use the type guard from
   * `template-origin.ts` before reading specific fields.
   */
  metadata?: TemplateOriginMetadata | Record<string, unknown> | null;
  /** Phase 4 (Template Center): ownership/source attribution. */
  createdById?: string | null;
  updatedById?: string | null;
  /** Phase 4.6: human-readable creator name resolved by backend join. */
  createdByDisplayName?: string | null;
  /**
   * Phase 5B.1 — Coming-soon flag.
   *
   * Set by backend `templates.service.listV1` based on the
   * `ACTIVE_TEMPLATE_CODES` registry. Templates with this flag MUST be
   * rendered as disabled (no Use template / no Preview navigation to
   * instantiate flow). Backend instantiation routes are not hard-rejected;
   * the UI is the gate so the policy is reversible per template.
   */
  comingSoon?: boolean;
  /** Phase 5B.1 — stable backend code (e.g. `pm_waterfall_v2`). */
  templateCode?: string | null;
  /** TC-B1 — admin-curated org highlight. */
  isPreferred?: boolean;
  /** TC-B1 — incremented on successful instantiation. */
  usageCount?: number;
  /** TC-B5 — enabled project tab ids at instantiation. */
  defaultTabs?: string[];
  /** TC-B5 — column config including defaultView. */
  columnConfig?: TemplateColumnConfig;
  /** TC-B3 — custom status groups presence (org/custom templates). */
  statusGroups?: TemplateStatusGroup[];
  /** AD-016 — methodology capability snapshot (copied on instantiate). */
  capabilities?: import('@/features/projects/capabilities').ProjectCapabilities;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  category?: string;
  kind?: 'project' | 'board' | 'mixed';
  icon?: string;
  templateScope: TemplateScope;
  methodology?: 'waterfall' | 'scrum' | 'agile' | 'kanban' | 'hybrid';
  structure?: TemplateStructureDto;
  defaultEnabledKPIs?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  methodology?: 'waterfall' | 'scrum' | 'agile' | 'kanban' | 'hybrid';
  structure?: TemplateStructureDto;
  defaultEnabledKPIs?: string[];
  metadata?: Record<string, any>;
}

export interface InstantiateTemplateDto {
  projectName: string;
}

export interface InstantiateTemplateResponse {
  projectId: string;
  projectName: string;
  state: string;
  structureLocked: boolean;
  phaseCount: number;
  taskCount: number;
}

/**
 * List templates
 * Includes x-workspace-id header if workspace is selected
 *
 * Phase 5A truth-closure fix:
 * The shared axios instance in `@/lib/api` already runs a response
 * interceptor that strips the `{ data: T }` envelope, so the helper
 * receives the unwrapped payload directly. The previous implementation
 * double-unwrapped (`response.data?.data || response.data || []`),
 * which silently returned `undefined → []` for every list call. The
 * Template Center looked empty even when the backend returned 14 rows.
 *
 * Phase 5C — `request.get` unwraps `{ data, meta }` / `__zephixInner` (see `@/lib/api`).
 */
export async function listTemplates(): Promise<TemplateDto[]> {
  const workspaceId = getActiveWorkspaceId();

  const config: any = {};
  if (workspaceId) {
    config.headers = {
      'x-workspace-id': workspaceId,
    };
  }

  const result = await request.get<unknown>('/templates', config);
  return mapTemplateList(result);
}

/**
 * Create template
 * Includes x-workspace-id header only for WORKSPACE scope
 */
export async function createTemplate(dto: CreateTemplateDto): Promise<TemplateDto> {
  const config: any = {};
  
  // Only include workspace header for WORKSPACE scope
  if (dto.templateScope === 'WORKSPACE') {
    const workspaceId = getActiveWorkspaceId();
    if (!workspaceId) {
      throw new Error('Workspace required for WORKSPACE templates');
    }
    config.headers = {
      'x-workspace-id': workspaceId,
    };
  }

  const response = await api.post<{ data: TemplateDto }>('/templates', dto, config);
  return response.data?.data || response.data;
}

/**
 * Update template
 * Includes x-workspace-id header only if templateScope is WORKSPACE
 * Note: We need to fetch the template first to know its scope, or pass it as parameter
 * For MVP, we'll include header if workspace is selected (backend will validate)
 */
export async function updateTemplate(
  templateId: string,
  dto: UpdateTemplateDto,
  templateScope?: TemplateScope
): Promise<TemplateDto> {
  const config: any = {};
  
  // Include workspace header only for WORKSPACE scope
  if (templateScope === 'WORKSPACE') {
    const workspaceId = getActiveWorkspaceId();
    if (workspaceId) {
      config.headers = {
        'x-workspace-id': workspaceId,
      };
    }
  }

  const response = await api.patch<{ data: TemplateDto }>(`/templates/${templateId}`, dto, config);
  return response.data?.data || response.data;
}

/**
 * Publish template
 * Includes x-workspace-id header only if templateScope is WORKSPACE
 */
export async function publishTemplate(
  templateId: string,
  templateScope?: TemplateScope
): Promise<TemplateDto> {
  const config: any = {};
  
  // Include workspace header only for WORKSPACE scope
  if (templateScope === 'WORKSPACE') {
    const workspaceId = getActiveWorkspaceId();
    if (workspaceId) {
      config.headers = {
        'x-workspace-id': workspaceId,
      };
    }
  }

  const response = await api.post<{ data: TemplateDto }>(`/templates/${templateId}/publish`, {}, config);
  return response.data?.data || response.data;
}

/**
 * Instantiate template
 * Requires workspace header
 */
export async function instantiateTemplate(
  templateId: string,
  dto: InstantiateTemplateDto
): Promise<InstantiateTemplateResponse> {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) {
    throw new Error('Workspace required for template instantiation');
  }

  const response = await api.post<{ data: InstantiateTemplateResponse }>(
    `/templates/${templateId}/instantiate-v5_1`,
    dto,
    {
      headers: {
        'x-workspace-id': workspaceId,
      },
    }
  );
  return response.data?.data || response.data;
}

/**
 * Get single template by ID
 */
export async function getTemplate(templateId: string): Promise<TemplateDto> {
  const response = await api.get<{ data: unknown }>(`/templates/${templateId}`);
  const raw = response.data?.data || response.data;
  return mapTemplateDto(raw);
}

/**
 * TC-B6 / TC-F2 — admin-curated preferred flag (ORG templates only; SYSTEM → 403).
 */
export async function setTemplatePreferred(
  templateId: string,
  isPreferred: boolean,
): Promise<TemplateDto> {
  const result = await request.patch<unknown>(`/templates/${templateId}/preferred`, {
    isPreferred,
  });
  return mapTemplateDto(result);
}

/**
 * TC-B6 / TC-F2 — attach a catalog document template onto an existing project.
 */
export async function attachDocumentFromTemplate(
  projectId: string,
  docKey: string,
  blocksGateKey?: string,
): Promise<unknown> {
  const workspaceId = getActiveWorkspaceId();
  const config: { headers?: Record<string, string> } = {};
  if (workspaceId) {
    config.headers = { 'x-workspace-id': workspaceId };
  }
  return request.post(
    `/projects/${projectId}/documents/from-template`,
    { docKey, ...(blocksGateKey ? { blocksGateKey } : {}) },
    config,
  );
}
