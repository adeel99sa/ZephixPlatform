import type { InboxItem } from "../types";
import { InboxEmptyState } from "./InboxEmptyState";
import { InboxListItem } from "./InboxListItem";
import { LoadingState } from "@/ui/components/LoadingState";

type InboxListProps = {
  items: InboxItem[];
  tab: "primary" | "other" | "later" | "cleared";
  selectedId: string | null;
  loading: boolean;
  groupByDate: boolean;
  hasActiveFilters: boolean;
  onSelect: (item: InboxItem) => void;
};

function dateKey(isoDate: string): string {
  const date = new Date(isoDate);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

export function InboxList({
  items,
  tab,
  selectedId,
  loading,
  groupByDate,
  hasActiveFilters,
  onSelect,
}: InboxListProps) {
  if (loading) return <LoadingState message="Loading inbox items..." className="min-h-[320px]" />;
  if (items.length === 0) return <InboxEmptyState tab={tab} filtered={hasActiveFilters} />;

  if (!groupByDate) {
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <InboxListItem
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    );
  }

  const grouped = new Map<string, InboxItem[]>();
  for (const item of items) {
    const key = dateKey(item.time);
    const list = grouped.get(key) || [];
    list.push(item);
    grouped.set(key, list);
  }

  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([key, dayItems]) => (
        <section key={key}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {new Date(key).toLocaleDateString()}
          </h3>
          <div className="space-y-2">
            {dayItems.map((item) => (
              <InboxListItem
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                onClick={() => onSelect(item)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

