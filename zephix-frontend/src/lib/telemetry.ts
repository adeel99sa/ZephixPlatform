// Minimal telemetry module for development

export type TelemetryEvent =
  | 'app.opened'
  | 'command.palette.opened'
  | 'kpi.projects_count.viewed'
  | 'kpi.projects_count.fetched'
  | 'workitem.created'
  | 'workitem.updated'
  | 'workitem.deleted'
  | 'dashboard.viewed'
  | 'dashboard.created'
  | 'template.applied'
  | 'workspace.selected'
  | 'workspace.created'
  | 'project.created'
  | 'workspace.settings.opened'
  | 'workspace.settings.saved'
  | 'workspace.permissions.updated'
  | 'workspace.member.invited'
  | 'workspace.settings.fromHome'
  | 'workspace.quick.newProject'
  | 'workspace.quick.newBoard'
  | 'workspace.quick.invite'
  | 'workspace.quick.templateCenter'
  | string; // Allow custom events

type TelemetryProps = Record<string, unknown>;

// Named export for direct import: `import { track } from '@/lib/telemetry'`
export function track(event: TelemetryEvent, props: TelemetryProps = {}) {
  try {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[telemetry]', event, props);
    }
    // Add analytics vendor integration here when needed
    // window.analytics?.track?.(event, props);
  } catch {
    // Never throw from telemetry
  }
}

export function identify(userId: string, traits?: Record<string, any>) {
  try {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[telemetry] User:', userId, traits);
    }
  } catch {
    // Never throw from telemetry
  }
}

export function page(name: string, properties?: Record<string, any>) {
  try {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[telemetry] Page:', name, properties);
    }
  } catch {
    // Never throw from telemetry
  }
}

// Object with methods for default import
export const telemetry = { track, identify, page };
export default telemetry;
