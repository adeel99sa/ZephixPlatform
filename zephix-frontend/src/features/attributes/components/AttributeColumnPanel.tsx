import type { RefObject } from 'react';

import type { AttributeDefinition } from '../attributes.types';
import { UnifiedWorkFieldsPanel } from '@/features/projects/fields/UnifiedWorkFieldsPanel';

export type AttributeColumnPanelProps = {
  available: AttributeDefinition[];
  visibleIds: Set<string>;
  onToggleColumn: (definitionId: string, visible: boolean) => void;
  onCreated: (definition: AttributeDefinition) => void;
  workspaceId: string;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
};

/** @deprecated Prefer UnifiedWorkFieldsPanel with `customFields` — kept for narrow custom-field-only mounts. */
export function AttributeColumnPanel({
  available,
  visibleIds,
  onToggleColumn,
  onCreated,
  workspaceId,
  anchorRef,
  onClose,
}: AttributeColumnPanelProps) {
  return (
    <UnifiedWorkFieldsPanel
      anchorRef={anchorRef}
      onClose={onClose}
      testId="attribute-column-panel"
      customFields={{
        available,
        visibleIds,
        onToggleColumn,
        onCreated,
        workspaceId,
      }}
    />
  );
}
