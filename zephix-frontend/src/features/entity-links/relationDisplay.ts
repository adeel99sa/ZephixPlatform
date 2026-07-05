import type { EntityLink, RelationPickerOption } from './entityLinks.types';

export function otherEndpoint(
  link: EntityLink,
  taskId: string,
): { type: EntityLink['sourceEntityType']; id: string } | null {
  if (link.sourceEntityType === 'TASK' && link.sourceEntityId === taskId) {
    return { type: link.targetEntityType, id: link.targetEntityId };
  }
  if (link.targetEntityType === 'TASK' && link.targetEntityId === taskId) {
    return { type: link.sourceEntityType, id: link.sourceEntityId };
  }
  return null;
}

export function resolveEndpointLabel(
  type: EntityLink['sourceEntityType'],
  id: string,
  labelByKey: Map<string, string>,
): string {
  return labelByKey.get(`${type}:${id}`) ?? `${type} ${id.slice(0, 8)}…`;
}

export function buildLabelMap(options: RelationPickerOption[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const opt of options) {
    map.set(`${opt.entityType}:${opt.entityId}`, opt.label);
  }
  return map;
}

export function relationDirectionLabel(
  link: EntityLink,
  taskId: string,
  otherLabel: string,
): string {
  if (link.relationType === 'MITIGATES') {
    if (link.sourceEntityType === 'TASK' && link.sourceEntityId === taskId) {
      return `mitigates → ${otherLabel}`;
    }
    return `← mitigated by ${otherLabel}`;
  }
  return `relates to ${otherLabel}`;
}

export function relationTypeChip(link: EntityLink): string {
  return link.relationType === 'MITIGATES' ? 'Mitigates' : 'Relates to';
}
