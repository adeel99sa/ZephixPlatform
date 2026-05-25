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

/** Locked Pause 1d copy (IP-safe, title case labels). */
export const BUILTIN_ARTIFACT_TYPES: readonly ArtifactTypeMeta[] = [
  {
    id: 'risk_register',
    label: 'Risk Register',
    description: 'Identify potential risks, assess impact, and track mitigation plans.',
    icon: AlertTriangle,
  },
  {
    id: 'raid_log',
    label: 'RAID Log',
    description: 'Track risks, assumptions, issues, and dependencies in one place.',
    icon: ClipboardList,
  },
  {
    id: 'lessons_learned',
    label: 'Lessons Learned',
    description: 'Capture insights and takeaways to improve future outcomes.',
    icon: BookOpen,
  },
  {
    id: 'decision_log',
    label: 'Decision Log',
    description: 'Record key decisions, rationale, and agreed actions.',
    icon: Scale,
  },
  {
    id: 'stakeholder_register',
    label: 'Stakeholder Register',
    description: 'Identify stakeholders, understand needs, and track engagement.',
    icon: Users,
  },
  {
    id: 'status_report',
    label: 'Status Report',
    description: 'Summarize progress, highlights, and next steps.',
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
