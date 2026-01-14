import { createHash } from 'crypto';

/**
 * Canonical JSON serializer - ensures deterministic output
 */
function canonicalJsonStringify(obj: any): string {
  // Sort keys recursively
  function sortKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(sortKeys);
    }
    return Object.keys(obj)
      .sort()
      .reduce((sorted: any, key: string) => {
        sorted[key] = sortKeys(obj[key]);
        return sorted;
      }, {});
  }

  return JSON.stringify(sortKeys(obj));
}

/**
 * Generate deterministic idempotency key from Jira webhook payload
 */
export function generateWebhookIdempotencyKey(
  connectionId: string,
  payload: any,
): string {
  // Primary: Use webhookEvent + issue.id + timestamp (if all present)
  if (payload.webhookEvent && payload.issue?.id && payload.timestamp) {
    return `jira:webhook:${connectionId}:${payload.webhookEvent}:${payload.issue.id}:${payload.timestamp}`;
  }

  // Fallback: Use issue.key + updated timestamp (stable field names)
  if (payload.issue?.key && payload.issue?.fields?.updated) {
    return `jira:webhook:${connectionId}:${payload.issue.key}:${payload.issue.fields.updated}`;
  }

  // Last resort: Canonical hash of relevant fields only
  const relevantFields = {
    webhookEvent: payload.webhookEvent,
    issue: {
      id: payload.issue?.id,
      key: payload.issue?.key,
      updated: payload.issue?.fields?.updated,
    },
    timestamp: payload.timestamp,
  };

  const canonical = canonicalJsonStringify(relevantFields);
  const hash = createHash('sha256')
    .update(canonical)
    .digest('hex')
    .substring(0, 32);
  return `jira:webhook:${connectionId}:hash:${hash}`;
}

/**
 * Generate idempotency key for polling
 */
export function generatePollingIdempotencyKey(
  connectionId: string,
  issue: {
    id: string;
    key: string;
    updated: string; // ISO timestamp
  },
): string {
  // Use connectionId + issue.id + updated (monotonic)
  return `jira:poll:${connectionId}:${issue.id}:${issue.updated}`;
}
