// ─────────────────────────────────────────────────────────────────────────────
// Integrations API — Step 22.6
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from '@/lib/api/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResp = any;

export interface IntegrationConnectionItem {
  id: string;
  workspaceId: string | null;
  provider: 'SLACK' | 'WEBHOOK' | 'JIRA';
  status: string;
  config: Record<string, unknown> | null;
  lastError: string | null;
  errorCount: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function listConnections(workspaceId: string): Promise<IntegrationConnectionItem[]> {
  const res: AnyResp = await apiClient.get(`/integrations/workspaces/${workspaceId}`);
  return res.data ?? res ?? [];
}

// ─── Slack ───────────────────────────────────────────────────────────────────

export async function connectSlack(
  workspaceId: string,
  botToken: string,
  channelId: string,
  channelName?: string,
): Promise<{ id: string; status: string; teamName?: string }> {
  const res: AnyResp = await apiClient.post(`/integrations/workspaces/${workspaceId}/slack/connect`, {
    botToken,
    channelId,
    channelName,
  });
  return res.data ?? res;
}

export async function testSlack(workspaceId: string): Promise<{ connected: boolean; error?: string }> {
  const res: AnyResp = await apiClient.post(`/integrations/workspaces/${workspaceId}/slack/test`);
  return res.data ?? res;
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export async function connectWebhook(
  workspaceId: string,
  endpointUrl: string,
  secret?: string,
  enabledEventTypes?: string[],
): Promise<{ id: string; status: string }> {
  const res: AnyResp = await apiClient.post(`/integrations/workspaces/${workspaceId}/webhook/connect`, {
    endpointUrl,
    secret,
    enabledEventTypes,
  });
  return res.data ?? res;
}

// ─── Connection management ───────────────────────────────────────────────────

export async function disableConnection(id: string): Promise<void> {
  await apiClient.post(`/integrations/workspaces/connections/${id}/disable`);
}

export async function enableConnection(id: string): Promise<void> {
  await apiClient.post(`/integrations/workspaces/connections/${id}/enable`);
}

export async function deleteConnection(id: string): Promise<void> {
  await apiClient.delete(`/integrations/workspaces/connections/${id}`);
}

// ─── Delivery logs ───────────────────────────────────────────────────────────

export interface DeliveryLogItem {
  id: string;
  eventType: string;
  status: 'SENT' | 'FAILED';
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

export async function getDeliveryLogs(connectionId: string): Promise<DeliveryLogItem[]> {
  const res: AnyResp = await apiClient.get(`/integrations/workspaces/connections/${connectionId}/logs`);
  return res.data ?? res ?? [];
}

// ─── Jira Import ─────────────────────────────────────────────────────────────

export interface JiraImportPreview {
  projectsFound: Array<{ key: string; name: string; issueCount: number }>;
  totalIssues: number;
  mappingSummary: {
    statusesFound: string[];
    assigneesFound: string[];
    typesFound: string[];
  };
  warnings: string[];
}

export async function jiraImportPreview(
  workspaceId: string,
  connectionId: string,
  projectKey?: string,
  jqlFilter?: string,
): Promise<JiraImportPreview> {
  const res: AnyResp = await apiClient.post(`/integrations/workspaces/${workspaceId}/jira/import/preview`, {
    connectionId,
    projectKey,
    jqlFilter,
  });
  return res.data ?? res;
}

export async function jiraImportRun(
  workspaceId: string,
  connectionId: string,
  externalProjectKey: string,
  targetProjectName: string,
  jqlFilter?: string,
): Promise<{ projectId: string; tasksCreated: number; warnings: string[] }> {
  const res: AnyResp = await apiClient.post(`/integrations/workspaces/${workspaceId}/jira/import/run`, {
    connectionId,
    externalProjectKey,
    targetProjectName,
    jqlFilter,
  });
  return res.data ?? res;
}
