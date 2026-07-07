export interface ApiNotificationRow {
  id: string;
  title: string;
  body?: string | null;
  priority: string;
  read?: boolean;
  createdAt: string | Date;
  workspaceId?: string | null;
  data?: Record<string, unknown>;
  eventType?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  priority: string;
  isRead: boolean;
  createdAt: string;
  workspaceId?: string;
  data?: Record<string, unknown>;
  eventType?: string;
}

export interface NotificationsListResult {
  notifications: NotificationItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function mapNotificationItem(row: ApiNotificationRow): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    priority: row.priority,
    isRead: row.read ?? false,
    createdAt:
      typeof row.createdAt === 'string'
        ? row.createdAt
        : new Date(row.createdAt).toISOString(),
    workspaceId: row.workspaceId ?? undefined,
    data: row.data,
    eventType: row.eventType,
  };
}

/** Normalizes GET /notifications list payloads (unwrap + field mapping). */
export function parseNotificationsListResponse(raw: unknown): NotificationsListResult {
  const payload =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;

  const list =
    (Array.isArray(payload?.notifications) ? payload.notifications : null) ??
    (Array.isArray(payload?.items) ? payload.items : null) ??
    (Array.isArray(raw) ? raw : []);

  const notifications = (list as ApiNotificationRow[]).map(mapNotificationItem);
  const nextCursor =
    typeof payload?.nextCursor === 'string' ? payload.nextCursor : null;
  const hasMore =
    typeof payload?.hasMore === 'boolean' ? payload.hasMore : Boolean(nextCursor);

  return { notifications, nextCursor, hasMore };
}

export function buildTaskDeepLink(
  notification: Pick<NotificationItem, 'workspaceId' | 'data'>,
): string | null {
  const data = notification.data ?? {};
  const taskId = data.taskId as string | undefined;
  const projectId = data.projectId as string | undefined;
  const workspaceId = notification.workspaceId;
  if (!workspaceId || !projectId || !taskId) return null;
  return `/workspaces/${workspaceId}/projects/${projectId}?task=${taskId}`;
}
