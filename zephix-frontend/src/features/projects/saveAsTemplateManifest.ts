/**
 * TC-F3 — Save-as-Template snapshot manifest (checkbox → API payload).
 *
 * Dialog defaults (approved design):
 *   statuses ✓, fields ✓, views ✓, phases ✓, governance ✓
 *   sample tasks □ (org-visibility warning), documents □
 *
 * API omit semantics (backend): missing flags default to true so the
 * duplicate-project path keeps full structure when it only sends a name.
 */

export type SaveAsTemplateManifest = {
  includeStatuses: boolean;
  includeFields: boolean;
  includeViews: boolean;
  includePhases: boolean;
  includeSampleTasks: boolean;
  includeDocuments: boolean;
  includeGovernance: boolean;
};

/** Approved dialog defaults — opt-in for sample tasks + documents. */
export const SAVE_AS_TEMPLATE_DIALOG_DEFAULTS: SaveAsTemplateManifest = {
  includeStatuses: true,
  includeFields: true,
  includeViews: true,
  includePhases: true,
  includeSampleTasks: false,
  includeDocuments: false,
  includeGovernance: true,
};

export type SaveAsTemplatePayload = {
  name?: string;
  description?: string;
  category?: string;
} & SaveAsTemplateManifest;

export function buildSaveAsTemplatePayload(input: {
  name: string;
  description?: string;
  category?: string;
  manifest: SaveAsTemplateManifest;
}): SaveAsTemplatePayload {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    category: input.category?.trim() || undefined,
    ...input.manifest,
  };
}

export const MANIFEST_CHECKBOX_META: ReadonlyArray<{
  key: keyof SaveAsTemplateManifest;
  label: string;
  warning?: string;
}> = [
  { key: 'includeStatuses', label: 'Statuses' },
  { key: 'includeFields', label: 'Fields' },
  { key: 'includeViews', label: 'Views' },
  { key: 'includePhases', label: 'Phases' },
  {
    key: 'includeSampleTasks',
    label: 'Sample tasks',
    warning:
      'Sample tasks may expose org-visible titles and structure to anyone who uses this template.',
  },
  { key: 'includeDocuments', label: 'Documents' },
  { key: 'includeGovernance', label: 'Governance' },
];
