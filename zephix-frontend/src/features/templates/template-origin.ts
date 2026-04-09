/**
 * Phase 4.6 (Template Center cleanup):
 * Frontend mirror of the backend `TemplateOriginMetadata` contract at
 * `zephix-backend/src/modules/templates/dto/template-origin-metadata.ts`.
 *
 * Field names must match exactly. Any new field added on the backend
 * must be added here in the same commit.
 */
export interface TemplateOriginMetadata {
  sourceProjectId: string;
  sourceProjectName: string;
  savedAt: string;
  savedByUserId: string;
  methodologyConfig?: Record<string, unknown> | null;
  activeKpiIds?: string[];
}

/** Type guard for loose backend payloads. */
export function isTemplateOriginMetadata(
  v: unknown,
): v is TemplateOriginMetadata {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.sourceProjectId === 'string' &&
    typeof m.sourceProjectName === 'string' &&
    typeof m.savedAt === 'string' &&
    typeof m.savedByUserId === 'string'
  );
}
