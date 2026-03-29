import { request } from "@/lib/api";
import type {
  InboxFilterOptions,
  InboxItem,
  InboxListResponse,
  InboxSeverity,
  InboxStatus,
  InboxTab,
  InboxType,
} from "./types";

export type InboxListParams = {
  tab?: InboxTab;
  type?: InboxType;
  projectId?: string;
  severity?: InboxSeverity;
  status?: InboxStatus;
  unreadOnly?: boolean;
  groupBy?: "none" | "date";
  sort?: "newest" | "oldest";
  limit?: number;
};

export const inboxApi = {
  list: (params: InboxListParams) =>
    request.get<InboxListResponse>("/inbox", { params }),
  get: (itemId: string) => request.get<InboxItem>(`/inbox/${itemId}`),
  markRead: (itemId: string) =>
    request.post<{ success: true }>(`/inbox/${itemId}/read`),
  clear: (itemId: string) =>
    request.post<{ success: true }>(`/inbox/${itemId}/clear`),
  later: (itemId: string, deferredUntil?: string) =>
    request.post<{ success: true; deferredUntil: string }>(
      `/inbox/${itemId}/later`,
      deferredUntil ? { deferredUntil } : {},
    ),
  filterOptions: () => request.get<InboxFilterOptions>("/inbox/filters/options"),
};

