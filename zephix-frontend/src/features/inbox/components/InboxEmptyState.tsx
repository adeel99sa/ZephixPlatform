import { EmptyState } from "@/ui/components/EmptyState";
import type { InboxTab } from "../types";

const TAB_COPY: Record<InboxTab, { title: string; description: string }> = {
  primary: {
    title: "No priority items",
    description: "High-signal operational events will appear here.",
  },
  other: {
    title: "No activity items",
    description: "You're up to date on supporting inbox activity.",
  },
  later: {
    title: "No snoozed items",
    description: "Snoozed items will appear here until they are triaged.",
  },
  cleared: {
    title: "No resolved items",
    description: "Resolved inbox events will show here for quick audit.",
  },
};

export function InboxEmptyState({ tab, filtered = false }: { tab: InboxTab; filtered?: boolean }) {
  if (filtered) {
    return (
      <EmptyState
        title="No matching inbox items"
        description="Try clearing one or more filters to widen the inbox view."
      />
    );
  }
  const copy = TAB_COPY[tab];
  return <EmptyState title={copy.title} description={copy.description} />;
}

