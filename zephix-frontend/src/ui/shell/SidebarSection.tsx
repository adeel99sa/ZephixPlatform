import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { PortalTooltip } from "./PortalTooltip";
import { AnchoredMenu, type AnchoredMenuItem } from "./AnchoredMenu";

type SidebarSectionProps = {
  title?: string;
  /** When true, the section header title is hidden (e.g. to avoid redundancy with nav item label). */
  hideTitle?: boolean;
  children: React.ReactNode;
  contentClassName?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  /** Simple click handler for ... button (legacy — use settingsMenuItems for dropdown) */
  onSettingsClick?: () => void;
  /** Dropdown menu items for the ... button. Takes priority over onSettingsClick. */
  settingsMenuItems?: AnchoredMenuItem[];
  onCreateClick?: () => void;
  settingsLabel?: string;
  createLabel?: string;
  /** When true, the + button is always visible (not just on hover). */
  alwaysShowCreate?: boolean;
  /** When true, the settings dropdown straddles the sidebar edge (50/50 overlap). */
  straddleSettingsMenu?: boolean;
};

export function SidebarSection({
  title = "",
  hideTitle = false,
  children,
  contentClassName = "",
  collapsible = false,
  defaultExpanded = true,
  onSettingsClick,
  settingsMenuItems,
  onCreateClick,
  settingsLabel = "Section Settings",
  createLabel = "Create",
  alwaysShowCreate = false,
  straddleSettingsMenu = false,
}: SidebarSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasSettingsMenu = settingsMenuItems && settingsMenuItems.length > 0;
  const hasSettings = hasSettingsMenu || Boolean(onSettingsClick);
  const hasActions = hasSettings || Boolean(onCreateClick);

  return (
    <section className="group/section rounded-xl border border-slate-200 bg-white p-2 shadow-[var(--zs-shadow-card)]">
      <div className={`flex w-full items-center justify-between ${hideTitle && hasActions ? "" : "pb-1"}`}>
        {/* Title area — hidden when hideTitle; when hideTitle+hasActions, children go here (same line as +) */}
        {!hideTitle ? (
          <button
            type="button"
            onClick={() => {
              if (collapsible) setExpanded((prev) => !prev);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500"
            aria-label={collapsible ? `${expanded ? "Collapse" : "Expand"} ${title}` : title}
          >
            {collapsible ? (
              <span className="inline-flex h-3 w-3 items-center justify-center opacity-0 transition-opacity group-hover/section:opacity-100">
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </span>
            ) : null}
            {title}
          </button>
        ) : hasActions ? (
          <div className="min-w-0 flex-1">{children}</div>
        ) : (
          <span className="flex-1" aria-hidden />
        )}

        {/* Action buttons — always on right, aligned with other sections */}
        {hasActions ? (
          <div className="flex w-[56px] shrink-0 -mr-0.5 items-center justify-end gap-1">
            {hasSettingsMenu ? (
              <AnchoredMenu
                items={settingsMenuItems}
                align="right"
                straddleRight={straddleSettingsMenu}
                trigger={({ ref, onClick: toggle, open }) => (
                  <PortalTooltip label={settingsLabel}>
                    {({ onMouseEnter, onMouseLeave }) => (
                      <button
                        ref={ref}
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggle(event);
                        }}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        className={`flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-opacity hover:bg-slate-100 hover:text-slate-600 ${
                          open ? "opacity-100 bg-slate-100 text-slate-600" : "opacity-0 group-hover/section:opacity-100"
                        }`}
                        aria-label={settingsLabel}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    )}
                  </PortalTooltip>
                )}
              />
            ) : onSettingsClick ? (
              <PortalTooltip label={settingsLabel}>
                {({ onMouseEnter, onMouseLeave }) => (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onSettingsClick();
                    }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover/section:opacity-100"
                    aria-label={settingsLabel}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                )}
              </PortalTooltip>
            ) : null}
            {onCreateClick ? (
              <PortalTooltip label={createLabel}>
                {({ onMouseEnter, onMouseLeave }) => (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onCreateClick();
                    }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    className={`flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-opacity hover:bg-slate-100 hover:text-slate-600 ${
                      alwaysShowCreate
                        ? "opacity-100"
                        : "opacity-0 group-hover/section:opacity-100"
                    }`}
                    aria-label={createLabel}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </PortalTooltip>
            ) : null}
          </div>
        ) : null}
      </div>
      {(!collapsible || expanded) && !(hideTitle && hasActions) ? (
        <div className={`space-y-1 ${contentClassName}`}>{children}</div>
      ) : null}
    </section>
  );
}
