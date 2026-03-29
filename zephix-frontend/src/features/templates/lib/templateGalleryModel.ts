import type { CanonicalTemplate, TemplatePresentationTier } from '../types';

/** Built-in row shape from `ProjectTemplateCenterModal` (client-only IDs). */
export type BuiltInTemplateRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: 'low' | 'medium' | 'high';
  phases: Array<{ name: string; order: number; estimatedDurationDays?: number }>;
  taskCount: number;
  isBuiltIn: true;
};

export type TemplateLike = CanonicalTemplate | BuiltInTemplateRow;

export interface TemplateGalleryCardModel {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: 'low' | 'medium' | 'high';
  presentationTier?: TemplatePresentationTier;
  isCustom?: boolean;
  phaseCount: number;
  taskCount: number;
  estimatedSetupMinutes?: number;
  icon?: string;
}

export function toGalleryCardModel(t: TemplateLike): TemplateGalleryCardModel {
  if ('isBuiltIn' in t && t.isBuiltIn) {
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      complexity: t.complexity,
      presentationTier: undefined,
      isCustom: false,
      phaseCount: t.phases.length,
      taskCount: t.taskCount,
    };
  }
  const ct = t as CanonicalTemplate;
  return {
    id: ct.id,
    name: ct.name,
    description: ct.description,
    category: ct.category,
    complexity: ct.complexity,
    presentationTier: ct.presentationTier,
    isCustom: ct.isCustom,
    phaseCount: ct.seedPhases?.length ?? 0,
    taskCount: ct.seedTasks?.length ?? 0,
  };
}
