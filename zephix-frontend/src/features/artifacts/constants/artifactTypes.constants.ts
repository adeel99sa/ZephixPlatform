import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  FileText,
  Scale,
  Users,
} from 'lucide-react';

import type { ProjectArtifactType } from '@/api/project-artifacts.types';

/** Sprint 5.2a built-in artifact types (single source of truth for picker + sidebar labels). */
export type BuiltInArtifactTypeId =
  | 'risk_register'
  | 'raid_log'
  | 'lessons_learned'
  | 'decision_log'
  | 'stakeholder_register'
  | 'status_report';

export interface ArtifactTypeMeta {
  id: BuiltInArtifactTypeId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const BUILTIN_ARTIFACT_TYPES: readonly ArtifactTypeMeta[] = [
  {
    id: 'risk_register',
    label: 'Risk register',
    description: 'Track risks with probability, impact, and response plans.',
    icon: AlertTriangle,
  },
  {
    id: 'raid_log',
    label: 'RAID log',
    description: 'Risks, actions, issues, and decisions in one running log.',
    icon: ClipboardList,
  },
  {
    id: 'lessons_learned',
    label: 'Lessons learned',
    description: 'Capture what worked, what did not, and recommendations.',
    icon: BookOpen,
  },
  {
    id: 'decision_log',
    label: 'Decision log',
    description: 'Record decisions, rationale, and owners over time.',
    icon: Scale,
  },
  {
    id: 'stakeholder_register',
    label: 'Stakeholder register',
    description: 'Stakeholders, interests, and engagement notes.',
    icon: Users,
  },
  {
    id: 'status_report',
    label: 'Status report',
    description: 'Structured status updates for sponsors and teams.',
    icon: FileText,
  },
] as const;

export function artifactTypeLabel(type: ProjectArtifactType | string): string {
  const found = BUILTIN_ARTIFACT_TYPES.find((t) => t.id === type);
  return found?.label ?? type.replace(/_/g, ' ');
}

export function artifactTypeIcon(type: ProjectArtifactType | string): LucideIcon {
  const found = BUILTIN_ARTIFACT_TYPES.find((t) => t.id === type);
  return found?.icon ?? FileText;
}
