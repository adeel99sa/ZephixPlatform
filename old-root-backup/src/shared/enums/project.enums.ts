/**
 * Shared Project Enums
 * 
 * Enterprise Standard: Single source of truth for all project-related enums
 * Used across DTOs, Entities, and Services to ensure consistency
 */

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum Methodology {
  WATERFALL = 'waterfall',
  SCRUM = 'scrum',
  AGILE = 'agile',
  HYBRID = 'hybrid',
  KANBAN = 'kanban'
}
