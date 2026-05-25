/** Sprint 5.2a — project artifacts API types (camelCase client models). */

export type ArtifactFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'enum'
  | 'person'
  | 'rating'
  | 'currency';

export type ProjectArtifactType =
  | 'risk_register'
  | 'raid_log'
  | 'lessons_learned'
  | 'status_report'
  | 'decision_log'
  | 'stakeholder_register'
  | 'backlog'
  | 'sprint_ceremonies'
  | 'user_story'
  | 'brd'
  | 'custom';

export type ArtifactItemPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: ArtifactFieldType;
  required: boolean;
  enumValues?: string[];
  defaultValue?: unknown;
  displayOrder?: number;
}

export interface ProjectArtifact {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  type: ProjectArtifactType;
  name: string;
  description?: string | null;
  icon?: string | null;
  position: number;
  templateId?: string | null;
  statusGroupId?: string | null;
  customFieldDefinitions: CustomFieldDefinition[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
}

export interface ProjectArtifactItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  artifactId: string;
  name: string;
  content: Record<string, unknown>;
  statusId?: string | null;
  assigneeId?: string | null;
  priority?: ArtifactItemPriority | null;
  dueDate?: string | null;
  customFieldValues: Record<string, unknown>;
  position: number;
  parentItemId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactItemsPage {
  items: ProjectArtifactItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateArtifactInput {
  type: ProjectArtifactType;
  name: string;
  description?: string;
  icon?: string;
  customFieldDefinitions?: CustomFieldDefinition[];
}

export interface UpdateArtifactInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  customFieldDefinitions?: CustomFieldDefinition[];
}

export interface CreateArtifactItemInput {
  name: string;
  content?: Record<string, unknown>;
  statusId?: string | null;
  assigneeId?: string | null;
  priority?: ArtifactItemPriority | null;
  dueDate?: string | null;
  customFieldValues?: Record<string, unknown>;
  parentItemId?: string | null;
}

export interface UpdateArtifactItemInput {
  name?: string;
  content?: Record<string, unknown>;
  statusId?: string | null;
  assigneeId?: string | null;
  priority?: ArtifactItemPriority | null;
  dueDate?: string | null;
  customFieldValues?: Record<string, unknown>;
}

export interface ListArtifactItemsParams {
  status?: string;
  assignee?: string;
  page?: number;
  limit?: number;
}
