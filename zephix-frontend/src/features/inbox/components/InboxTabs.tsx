import type { InboxTab } from "../types";

type InboxTabsProps = {
  activeTab: InboxTab;
  onChange: (tab: InboxTab) => void;
  counts: Record<InboxTab, number>;
};

const TABS: Array<{ key: InboxTab; label: string }> = [
  { key: "primary", label: "Priority" },
  { key: "other", label: "Activity" },
  { key: "later", label: "Snoozed" },
  { key: "cleared", label: "Resolved" },
];

export function InboxTabs({ activeTab, onChange, counts }: InboxTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            activeTab === tab.key
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
          aria-pressed={activeTab === tab.key}
        >
          {tab.label} <span className="opacity-80">({counts[tab.key] || 0})</span>
        </button>
      ))}
    </div>
  );
}

