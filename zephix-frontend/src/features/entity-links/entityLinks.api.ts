import { listArtifactItems, listProjectArtifacts } from '@/api/project-artifacts.api';
import { request } from '@/lib/api';
import { listRisks } from '@/features/risks/risks.api';

import type {
  EntityLink,
  EntityLinkEntityType,
  EntityLinkRelationType,
  RelationPickerOption,
} from './entityLinks.types';

function unwrapLink(raw: unknown): EntityLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? '');
  if (!id) return null;
  return {
    id,
    organizationId: String(r.organizationId ?? r.organization_id ?? ''),
    workspaceId: String(r.workspaceId ?? r.workspace_id ?? ''),
    sourceEntityType: String(r.sourceEntityType ?? r.source_entity_type ?? '') as EntityLinkEntityType,
    sourceEntityId: String(r.sourceEntityId ?? r.source_entity_id ?? ''),
    targetEntityType: String(r.targetEntityType ?? r.target_entity_type ?? '') as EntityLinkEntityType,
    targetEntityId: String(r.targetEntityId ?? r.target_entity_id ?? ''),
    relationType: String(r.relationType ?? r.relation_type ?? '') as EntityLinkRelationType,
    createdBy: String(r.createdBy ?? r.created_by ?? ''),
    createdAt: String(r.createdAt ?? r.created_at ?? ''),
  };
}

function unwrapLinks(body: unknown): EntityLink[] {
  if (Array.isArray(body)) {
    return body.map(unwrapLink).filter((l): l is EntityLink => l != null);
  }
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return ((body as { data: unknown[] }).data ?? [])
      .map(unwrapLink)
      .filter((l): l is EntityLink => l != null);
  }
  return [];
}

export async function listEntityLinksForEntity(
  workspaceId: string,
  entityType: EntityLinkEntityType,
  entityId: string,
): Promise<EntityLink[]> {
  const qs = new URLSearchParams({
    entityType,
    entityId,
  });
  const body = await request.get<unknown>(
    `/workspaces/${workspaceId}/entity-links?${qs.toString()}`,
    { headers: { 'x-workspace-id': workspaceId } },
  );
  return unwrapLinks(body);
}

export async function createEntityLink(
  workspaceId: string,
  input: {
    sourceEntityType: EntityLinkEntityType;
    sourceEntityId: string;
    targetEntityType: EntityLinkEntityType;
    targetEntityId: string;
    relationType: EntityLinkRelationType;
  },
): Promise<EntityLink> {
  const body = await request.post<unknown>(
    `/workspaces/${workspaceId}/entity-links`,
    input,
    { headers: { 'x-workspace-id': workspaceId } },
  );
  const link = unwrapLink(body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: unknown }).data : body);
  if (!link) throw new Error('Invalid create entity link response');
  return link;
}

export async function deleteEntityLink(workspaceId: string, linkId: string): Promise<void> {
  await request.delete(`/workspaces/${workspaceId}/entity-links/${linkId}`, {
    headers: { 'x-workspace-id': workspaceId },
  });
}

/** v1 picker scope: current project risks + artifact items (5.2a APIs). */
export async function loadProjectRelationPickerOptions(
  projectId: string,
): Promise<RelationPickerOption[]> {
  const options: RelationPickerOption[] = [];

  const risksRes = await listRisks({ projectId });
  for (const risk of risksRes.items) {
    if (!risk?.id) continue;
    options.push({
      entityType: 'RISK',
      entityId: risk.id,
      label: risk.title,
      subtitle: [risk.severity, risk.status].filter(Boolean).join(' · ') || undefined,
    });
  }

  const artifacts = await listProjectArtifacts(projectId);
  const itemPages = await Promise.all(
    artifacts.map(async (artifact) => {
      try {
        const page = await listArtifactItems(projectId, artifact.id, { limit: 50 });
        return page.items.map((item) => ({
          entityType: 'ARTIFACT' as const,
          entityId: item.id,
          artifactId: artifact.id,
          label: item.name,
          subtitle: artifact.name,
        }));
      } catch {
        return [];
      }
    }),
  );
  options.push(...itemPages.flat());

  return options;
}
