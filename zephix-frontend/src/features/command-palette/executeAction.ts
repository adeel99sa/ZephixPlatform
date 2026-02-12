import { apiClient } from '@/lib/api/client';
import { CommandAction, CommandConfirmType } from './commandPalette.api';

export interface ExecuteResult {
  success: boolean;
  navigateTo?: string;
  needsConfirm?: boolean;
  confirmMessage?: string;
  warnings?: Array<{ code: string; message: string }>;
  error?: string;
}

/**
 * Execute a command action. Returns navigation target or API result.
 * Zero business logic — only executes what backend told us is valid.
 */
export async function executeAction(
  action: CommandAction,
  confirmWarnings = false,
): Promise<ExecuteResult> {
  // Navigation-only actions
  if (action.deepLink && !action.apiCall) {
    return { success: true, navigateTo: action.deepLink };
  }

  // Actions requiring confirm but user hasn't confirmed
  if (
    action.confirm.required &&
    action.confirm.type !== CommandConfirmType.NONE &&
    !confirmWarnings
  ) {
    return {
      success: false,
      needsConfirm: true,
      confirmMessage: action.confirm.message || 'Are you sure?',
      warnings: action.warnings,
    };
  }

  // API call
  if (action.apiCall) {
    try {
      const body = { ...action.apiCall.bodyTemplate };
      if (confirmWarnings) {
        (body as Record<string, unknown>).confirmWarnings = true;
      }

      switch (action.apiCall.method) {
        case 'POST':
          await apiClient.post(action.apiCall.pathTemplate, body);
          break;
        case 'PUT':
          await apiClient.put(action.apiCall.pathTemplate, body);
          break;
        case 'PATCH':
          await apiClient.patch(action.apiCall.pathTemplate, body);
          break;
        case 'DELETE':
          await apiClient.delete(action.apiCall.pathTemplate);
          break;
        default:
          await apiClient.get(action.apiCall.pathTemplate);
      }

      return {
        success: true,
        navigateTo: action.deepLink || undefined,
      };
    } catch (err: any) {
      const code = err?.response?.data?.code;

      // Handle SOFT mode warnings from phase transitions
      if (code === 'PHASE_GATE_WARNINGS_CONFIRM_REQUIRED') {
        return {
          success: false,
          needsConfirm: true,
          confirmMessage: 'Gate warnings exist. Confirm to proceed.',
          warnings: err?.response?.data?.gateEvaluation?.warnings || action.warnings,
        };
      }

      return {
        success: false,
        error: err?.response?.data?.message || err?.message || 'Action failed',
      };
    }
  }

  // Deep link fallback
  if (action.deepLink) {
    return { success: true, navigateTo: action.deepLink };
  }

  return { success: false, error: 'No action handler available' };
}
