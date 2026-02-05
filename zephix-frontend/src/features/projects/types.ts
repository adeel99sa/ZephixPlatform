/**
 * Phase 7: Project types
 */

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on-hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ProjectRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Project entity type
export interface Project {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  status: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  estimatedEndDate?: string;
  health?: string;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// Project view types for shell page
export type ProjectViewType = 'list' | 'board' | 'timeline' | 'calendar';

export interface ProjectView {
  id: string;
  name: string;
  type: ProjectViewType;
  isEnabled: boolean;
  sortOrder: number;
}

// Work item types
export interface WorkItem {
  id: string;
  projectId: string;
  name: string;
  title?: string; // Alias for name (frontend convenience)
  key?: string; // Display key (e.g., PROJ-123)
  description?: string;
  status: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}
