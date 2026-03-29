import type { CanonicalTemplate, TemplatePresentationTier } from '../types';
import type { TemplateGalleryCardModel, TemplateLike } from './templateGalleryModel';

export type UiGroup = 'quick-start' | 'methodology' | 'by-use-case' | 'custom';

const METHODOLOGY_CATEGORIES = new Set([
  'Project Management',
  'Software Development',
]);

export type UiGroupInput = TemplateLike | TemplateGalleryCardModel;

export function getUiGroup(template: UiGroupInput): UiGroup {
  let category: string;
  let presentationTier: TemplatePresentationTier | undefined;
  let isCustom = false;
  let phaseCount: number;
  let taskCount: number;

  if ('isBuiltIn' in template && template.isBuiltIn) {
    category = template.category;
    phaseCount = template.phases.length;
    taskCount = template.taskCount;
  } else if ('templateVersion' in template) {
    const c = template as CanonicalTemplate;
    category = c.category;
    presentationTier = c.presentationTier;
    isCustom = Boolean(c.isCustom);
    phaseCount = c.seedPhases?.length ?? 0;
    taskCount = c.seedTasks?.length ?? 0;
  } else {
    const m = template as TemplateGalleryCardModel;
    category = m.category;
    presentationTier = m.presentationTier;
    isCustom = Boolean(m.isCustom);
    phaseCount = m.phaseCount;
    taskCount = m.taskCount;
  }

  if (isCustom) return 'custom';

  const isSimple =
    presentationTier === 'simple' || (phaseCount <= 2 && taskCount <= 5);

  if (isSimple) return 'quick-start';

  if (METHODOLOGY_CATEGORIES.has(category)) {
    return 'methodology';
  }

  return 'by-use-case';
}

export const groupOrder: UiGroup[] = [
  'quick-start',
  'methodology',
  'by-use-case',
  'custom',
];

export const groupLabels: Record<UiGroup, { title: string; subtitle: string }> = {
  'quick-start': {
    title: 'Quick Start',
    subtitle: 'Minimal setup, start delivering in minutes',
  },
  methodology: {
    title: 'Methodology',
    subtitle: 'Structured frameworks for consistent delivery',
  },
  'by-use-case': {
    title: 'By Use Case',
    subtitle: 'Tailored to specific team functions',
  },
  custom: {
    title: 'Your Organization',
    subtitle: 'Custom templates created by your team',
  },
};
