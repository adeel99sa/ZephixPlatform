import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/ui/components/PageHeader";
import { ErrorState } from "@/ui/components/ErrorState";
import { useAuth } from "@/state/AuthContext";
import { inboxApi } from "@/features/inbox/api";
import type {
  InboxAction,
  InboxFilterOptions,
  InboxItem,
  InboxSeverity,
  InboxStatus,
  InboxTab,
  InboxType,
} from "@/features/inbox/types";
import { InboxTabs } from "@/features/inbox/components/InboxTabs";
import { InboxFilterBar } from "@/features/inbox/components/InboxFilterBar";
import { InboxList } from "@/features/inbox/components/InboxList";
import { InboxDetailPanel } from "@/features/inbox/components/InboxDetailPanel";

export default function InboxPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<InboxTab>("primary");
  const [type, setType] = useState<InboxType | "all">("all");
  const [projectId, setProjectId] = useState<string | "all">("all");
  const [severity, setSeverity] = useState<InboxSeverity | "all">("all");
  const [status, setStatus] = useState<InboxStatus | "all">("all");
  const [unreadFirst, setUnreadFirst] = useState(true);
  const [groupByDate, setGroupByDate] = useState(true);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const [items, setItems] = useState<InboxItem[]>([]);
  const [counts, setCounts] = useState<Record<InboxTab, number>>({
    primary: 0,
    other: 0,
    later: 0,
    cleared: 0,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [options, setOptions] = useState<InboxFilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<InboxAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canMutate = ((user?.platformRole || user?.role || "").toUpperCase() !== "VIEWER");
  const hasActiveFilters = useMemo(
    () =>
      type !== "all" ||
      projectId !== "all" ||
      severity !== "all" ||
      status !== "all" ||
      sort !== "newest",
    [type, projectId, severity, status, sort],
  );

  async function loadInbox() {
    try {
      setLoading(true);
      setError(null);
      const baseParams = {
        type: type === "all" ? undefined : type,
        projectId: projectId === "all" ? undefined : projectId,
        severity: severity === "all" ? undefined : severity,
        status: status === "all" ? undefined : status,
        sort,
      };
      const [countResponse, response] = await Promise.all([
        inboxApi.list({
          ...baseParams,
          groupBy: "none",
          limit: 240,
        }),
        inboxApi.list({
          ...baseParams,
          tab,
          groupBy: groupByDate ? "date" : "none",
          limit: 120,
        }),
      ]);
      const nextCounts: Record<InboxTab, number> = {
        primary: 0,
        other: 0,
        later: 0,
        cleared: 0,
      };
      for (const countItem of countResponse.items || []) {
        nextCounts[countItem.tab] += 1;
      }
      setCounts(nextCounts);

      const sortedItems = [...(response.items || [])];
      if (unreadFirst) {
        sortedItems.sort((a, b) => {
          if (a.read === b.read) return 0;
          return a.read ? 1 : -1;
        });
      }
      setItems(sortedItems);
      setSelectedId((current) =>
        current && sortedItems.some((item) => item.id === current) ? current : null,
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load inbox items.");
      setItems([]);
      setCounts({ primary: 0, other: 0, later: 0, cleared: 0 });
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await inboxApi.filterOptions();
        if (active) setOptions(data);
      } catch {
        if (active) setOptions(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, type, projectId, severity, status, unreadFirst, groupByDate, sort]);

  useEffect(() => {
    let active = true;
    if (!selectedId) {
      setSelectedItem(null);
      setDetailError(null);
      setDetailLoading(false);
      return () => {
        active = false;
      };
    }
    setDetailLoading(true);
    setDetailError(null);
    (async () => {
      try {
        const detail = await inboxApi.get(selectedId);
        if (!active) return;
        setSelectedItem(detail);
      } catch (err: any) {
        if (!active) return;
        setSelectedItem(null);
        setDetailError(err?.response?.data?.message || "Failed to load item detail.");
      } finally {
        if (active) setDetailLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedId, detailReloadKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectItem = (item: InboxItem) => {
    setActionError(null);
    setSelectedId(item.id);
  };

  const onMarkRead = async () => {
    if (!selectedId || !canMutate || actionPending) return;
    setActionPending("mark_read");
    setActionError(null);
    try {
      await inboxApi.markRead(selectedId);
      await loadInbox();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Could not mark this item as read.");
    } finally {
      setActionPending(null);
    }
  };

  const onLater = async () => {
    if (!selectedId || !canMutate || actionPending) return;
    setActionPending("move_later");
    setActionError(null);
    try {
      await inboxApi.later(selectedId);
      await loadInbox();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Could not defer this item.");
    } finally {
      setActionPending(null);
    }
  };

  const onClear = async () => {
    if (!selectedId || !canMutate || actionPending) return;
    setActionPending("clear");
    setActionError(null);
    try {
      await inboxApi.clear(selectedId);
      await loadInbox();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Could not clear this item.");
    } finally {
      setActionPending(null);
    }
  };

  const onOpenSource = () => {
    if (!selectedItem?.deepLink) return;
    navigate(selectedItem.deepLink);
  };

  const clearFilters = () => {
    setType("all");
    setProjectId("all");
    setSeverity("all");
    setStatus("all");
    setSort("newest");
  };

  return (
    <div className="p-6" data-testid="inbox-page">
      <PageHeader
        title="Inbox"
        subtitle="Operational event triage for approvals and alerts. Inbox is triage, while My Tasks is execution."
      />

      <div className="mt-4 space-y-3">
        <InboxTabs activeTab={tab} onChange={setTab} counts={counts} />
        <InboxFilterBar
          options={options}
          type={type}
          setType={setType}
          projectId={projectId}
          setProjectId={setProjectId}
          severity={severity}
          setSeverity={setSeverity}
          status={status}
          setStatus={setStatus}
          unreadFirst={unreadFirst}
          setUnreadFirst={setUnreadFirst}
          groupByDate={groupByDate}
          setGroupByDate={setGroupByDate}
          sort={sort}
          setSort={setSort}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
      </div>

      {error ? (
        <ErrorState
          className="mt-4"
          title="Inbox unavailable"
          description={error}
          onRetry={() => {
            void loadInbox();
          }}
        />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <InboxList
            items={items}
            tab={tab}
            selectedId={selectedId}
            loading={loading}
            groupByDate={groupByDate}
            hasActiveFilters={hasActiveFilters}
            onSelect={selectItem}
          />
          <InboxDetailPanel
            item={selectedItem}
            loading={detailLoading}
            error={detailError}
            actionError={actionError}
            canMutate={canMutate}
            pendingAction={actionPending}
            onMarkRead={() => void onMarkRead()}
            onLater={() => void onLater()}
            onClear={() => void onClear()}
            onOpenSource={onOpenSource}
            onRetry={() => {
              if (selectedId) setDetailReloadKey((value) => value + 1);
            }}
          />
        </div>
      )}
    </div>
  );
}
