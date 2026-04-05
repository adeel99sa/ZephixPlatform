/**
 * Pass 3 — Full-screen card detail modal.
 * Left: expanded card content. Right: Settings + Data tabs.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface FullScreenCardModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Expanded card content (left panel) */
  children: React.ReactNode;
  /** Settings tab content */
  settingsContent?: React.ReactNode;
  /** Data tab content */
  dataContent?: React.ReactNode;
  /** Can user edit settings (Owner/Admin) */
  canMutate: boolean;
}

export function FullScreenCardModal({
  open,
  onClose,
  title,
  children,
  settingsContent,
  dataContent,
  canMutate,
}: FullScreenCardModalProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "data">("data");

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[5000] bg-black/50" onClick={onClose} />
      <div
        className="fixed inset-0 z-[5001] m-auto flex overflow-hidden rounded-xl bg-white shadow-2xl"
        style={{
          width: "min(96vw, 1100px)",
          height: "min(90vh, 750px)",
        }}
      >
        {/* Left — expanded card content */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>

        {/* Right — Settings / Data tabs */}
        <div className="flex w-80 shrink-0 flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-200">
            {(canMutate || settingsContent) && (
              <TabButton
                label="Settings"
                active={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
                disabled={!canMutate}
              />
            )}
            <TabButton
              label="Data"
              active={activeTab === "data"}
              onClick={() => setActiveTab("data")}
            />
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "settings" && canMutate && settingsContent ? (
              settingsContent
            ) : activeTab === "settings" && !canMutate ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-slate-400">Settings are available to workspace owners only.</p>
              </div>
            ) : (
              dataContent ?? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-slate-400">No data available.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function TabButton({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 px-4 py-3 text-sm font-medium transition ${
        active
          ? "border-b-2 border-blue-600 text-blue-700"
          : disabled
            ? "text-slate-300 cursor-not-allowed"
            : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

/* ── Reusable data table for Data tabs ── */

export function DataTable({
  columns,
  rows,
  emptyMessage,
}: {
  columns: string[];
  rows: Record<string, React.ReactNode>[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        {emptyMessage || "No records found."}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs font-medium text-slate-500">
        {rows.length} record{rows.length !== 1 ? "s" : ""}
        <span className="ml-2 text-slate-400">· Source: Current workspace</span>
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-xs font-medium text-slate-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-slate-700">
                    {row[col] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Reusable settings field ── */

export function SettingsField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

export function SettingsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  );
}

export function SettingsSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ReadOnlySource() {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
      Source: Current workspace (all projects)
    </div>
  );
}
