import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Eye, X } from 'lucide-react';

import type { AttributeDefinition } from '@/features/attributes/attributes.types';
import type { ProjectColumnKey } from '@/features/projects/columns';

import { CustomFieldsSection } from './CustomFieldsSection';
import { PropertiesFieldsSection } from './PropertiesFieldsSection';
import { TablePropertiesSection, type TableColumnVisibility } from './TablePropertiesSection';

const PANEL_WIDTH_PX = 320;
const VIEWPORT_MARGIN = 8;
const PANEL_Z = 55;

export type RegistryPropertiesConfig = {
  mode: 'registry';
  dataColumnOrder: readonly ProjectColumnKey[];
  hiddenColumns: Set<ProjectColumnKey>;
  onToggleColumn: (key: ProjectColumnKey) => void;
  governanceActive?: boolean;
  showOptionalPool?: boolean;
};

export type TablePropertiesConfig = {
  mode: 'table';
  columns: readonly TableColumnVisibility[];
  onToggleColumn: (colId: string) => void;
};

export type CustomFieldsConfig = {
  available: AttributeDefinition[];
  visibleIds: Set<string>;
  onToggleColumn: (definitionId: string, visible: boolean) => void;
  onCreated: (definition: AttributeDefinition) => void;
  workspaceId: string;
};

export type UnifiedWorkFieldsPanelProps = {
  onClose: () => void;
  anchorRef?: RefObject<HTMLElement | null>;
  extraExcludeRefs?: ReadonlyArray<RefObject<HTMLElement | null>>;
  properties?: RegistryPropertiesConfig | TablePropertiesConfig;
  customFields?: CustomFieldsConfig;
  /** Defaults to `unified-work-fields-panel`; legacy panels pass `attribute-column-panel`. */
  testId?: string;
};

export function UnifiedWorkFieldsPanel({
  onClose,
  anchorRef,
  extraExcludeRefs,
  properties,
  customFields,
  testId = 'unified-work-fields-panel',
}: UnifiedWorkFieldsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [fixedStyle, setFixedStyle] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef?.current;
    if (!anchor) {
      setFixedStyle(null);
      return;
    }

    const updatePosition = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.right - PANEL_WIDTH_PX),
        window.innerWidth - PANEL_WIDTH_PX - VIEWPORT_MARGIN,
      );
      setFixedStyle({
        position: 'fixed',
        top: rect.bottom + VIEWPORT_MARGIN,
        left,
        width: PANEL_WIDTH_PX,
        maxHeight: '70vh',
        zIndex: PANEL_Z,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideExtra = extraExcludeRefs?.some((r) => r.current?.contains(target));
      const insideAnchor = anchorRef?.current?.contains(target);
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !insideAnchor &&
        !insideExtra
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef, extraExcludeRefs]);

  const panelClasses =
    'overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/40';

  const panelInner = (
    <div
      ref={panelRef}
      className={
        fixedStyle
          ? panelClasses
          : `absolute right-0 top-full z-[55] mt-1 w-80 max-h-[70vh] ${panelClasses}`
      }
      style={fixedStyle ?? undefined}
      role="dialog"
      aria-label="Fields"
      data-testid={testId}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Fields
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close fields panel"
            data-testid="unified-work-fields-panel-close"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-5 px-4 py-3">
        {properties ? (
          <section aria-labelledby="unified-fields-properties-heading">
            <h2
              id="unified-fields-properties-heading"
              className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Properties
            </h2>
            {properties.mode === 'registry' ? (
              <PropertiesFieldsSection
                dataColumnOrder={properties.dataColumnOrder}
                hiddenColumns={properties.hiddenColumns}
                onToggleColumn={properties.onToggleColumn}
                governanceActive={properties.governanceActive}
                showOptionalPool={properties.showOptionalPool}
              />
            ) : (
              <TablePropertiesSection
                columns={properties.columns}
                onToggleColumn={properties.onToggleColumn}
              />
            )}
          </section>
        ) : null}

        {customFields ? (
          <section aria-labelledby="unified-fields-custom-heading">
            <h2
              id="unified-fields-custom-heading"
              className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Custom fields
            </h2>
            <CustomFieldsSection
              available={customFields.available}
              visibleIds={customFields.visibleIds}
              onToggleColumn={customFields.onToggleColumn}
              onCreated={customFields.onCreated}
              workspaceId={customFields.workspaceId}
            />
          </section>
        ) : null}
      </div>
    </div>
  );

  if (fixedStyle) {
    return createPortal(panelInner, document.body);
  }

  return panelInner;
}

/** @deprecated Use UnifiedWorkFieldsPanel — kept for CustomizeViewPanel gear deep-link parity. */
export type StandaloneFieldsPanelProps = {
  hiddenColumns: Set<ProjectColumnKey>;
  onToggleColumn: (key: ProjectColumnKey) => void;
  governanceActive?: boolean;
  onClose: () => void;
  anchorRef?: RefObject<HTMLElement | null>;
  extraExcludeRefs?: ReadonlyArray<RefObject<HTMLElement | null>>;
  dataColumnOrder: readonly ProjectColumnKey[];
  customFields?: CustomFieldsConfig;
};

/** Registry-mode unified panel (waterfall + agile Activities header "+"). */
export function StandaloneFieldsPanel({
  hiddenColumns,
  onToggleColumn,
  governanceActive = true,
  onClose,
  anchorRef,
  extraExcludeRefs,
  dataColumnOrder,
  customFields,
}: StandaloneFieldsPanelProps) {
  return (
    <UnifiedWorkFieldsPanel
      onClose={onClose}
      anchorRef={anchorRef}
      extraExcludeRefs={extraExcludeRefs}
      properties={{
        mode: 'registry',
        dataColumnOrder,
        hiddenColumns,
        onToggleColumn,
        governanceActive,
        showOptionalPool: true,
      }}
      customFields={customFields}
    />
  );
}
