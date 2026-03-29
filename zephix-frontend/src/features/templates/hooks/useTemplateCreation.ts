import { useCallback } from 'react';
import { createProject } from '@/features/projects/api';
import { createProjectFromTemplate } from '../api';
import type { CreateProjectFromTemplateInput, TemplateWorkflow } from '../types';
import type { TemplateLike } from '../lib/templateGalleryModel';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `templateId` is a database template UUID (excludes client `builtin-*` ids). */
export function isPersistedTemplateId(id: string): boolean {
  return UUID_RE.test(id);
}

function getPhaseRows(template: TemplateLike): Array<{ name: string; order: number }> {
  if ('isBuiltIn' in template && template.isBuiltIn) {
    return template.phases.map((p) => ({ name: p.name, order: p.order }));
  }
  const c = template;
  return (c.seedPhases ?? []).map((p) => ({ name: p.name, order: p.order }));
}

export function buildTemplateWorkflow(template: TemplateLike): TemplateWorkflow {
  const rows = getPhaseRows(template);
  const presentationTier =
    'presentationTier' in template ? template.presentationTier : undefined;

  const hasPhaseGates =
    presentationTier === 'enterprise' ||
    template.category === 'Project Management' ||
    rows.length > 2;

  const phaseGateRules =
    hasPhaseGates && rows.length > 0
      ? rows.map((phase) => ({
          phaseOrder: phase.order,
          approverRoles: ['PROJECT_MANAGER'],
          autoLock: true,
          name: `${phase.name} approval`,
          criteria: [
            'All tasks completed',
            'Deliverables reviewed',
            'Stakeholder sign-off',
          ],
        }))
      : [];

  return {
    creation: {
      copyStructure: true,
      copyPhaseGates: hasPhaseGates && phaseGateRules.length > 0,
      copyAutomations: false,
      assignDefaultRoles: true,
    },
    execution: {
      phaseGateRules,
    },
  };
}

export interface UseTemplateCreationOptions {
  onSuccess?: (projectId: string, workspaceId?: string) => void;
  onError?: (error: Error) => void;
}

export function useTemplateCreation(options: UseTemplateCreationOptions = {}) {
  const { onSuccess, onError } = options;

  const buildWorkflow = useCallback((template: TemplateLike) => {
    return buildTemplateWorkflow(template);
  }, []);

  const createFromTemplate = useCallback(
    async (
      template: TemplateLike,
      input: Omit<CreateProjectFromTemplateInput, 'templateId' | 'workflow'>,
    ) => {
      try {
        if (!isPersistedTemplateId(template.id)) {
          const created = await createProject({
            name: input.projectName.trim(),
            workspaceId: input.workspaceId,
          });
          onSuccess?.(created.id, input.workspaceId);
          return { id: created.id, workspaceId: input.workspaceId };
        }

        const workflow = buildTemplateWorkflow(template);
        const result = await createProjectFromTemplate({
          ...input,
          templateId: template.id,
          workflow,
        });
        onSuccess?.(result.id, result.workspaceId ?? input.workspaceId);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        throw err;
      }
    },
    [onSuccess, onError],
  );

  return { createFromTemplate, buildWorkflow };
}
