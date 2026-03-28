import { apiClient } from '@/lib/api/client';

// ─── Types mirrored from backend ─────────────────────────────────────────────

export enum CommandScope {
  ORG = 'ORG',
  WORKSPACE = 'WORKSPACE',
  PROJECT = 'PROJECT',
  PHASE = 'PHASE',
  TASK = 'TASK',
  SPRINT = 'SPRINT',
  CHANGE_REQUEST = 'CHANGE_REQUEST',
  DOCUMENT = 'DOCUMENT',
}

export enum CommandActionId {
  OPEN_ORG_SETTINGS = 'OPEN_ORG_SETTINGS',
  OPEN_WORKSPACE_SETTINGS = 'OPEN_WORKSPACE_SETTINGS',
  OPEN_POLICIES_ORG = 'OPEN_POLICIES_ORG',
  OPEN_POLICIES_WORKSPACE = 'OPEN_POLICIES_WORKSPACE',
  INVITE_MEMBER = 'INVITE_MEMBER',
  CREATE_WORKSPACE = 'CREATE_WORKSPACE',
  OPEN_PROJECT_PLAN = 'OPEN_PROJECT_PLAN',
  OPEN_PROJECT_BOARD = 'OPEN_PROJECT_BOARD',
  OPEN_PROJECT_GANTT = 'OPEN_PROJECT_GANTT',
  OPEN_PROJECT_SPRINTS = 'OPEN_PROJECT_SPRINTS',
  OPEN_PROJECT_CHANGE = 'OPEN_PROJECT_CHANGE',
  OPEN_PROJECT_DOCS = 'OPEN_PROJECT_DOCS',
  CREATE_TASK = 'CREATE_TASK',
  CREATE_SPRINT = 'CREATE_SPRINT',
  START_PHASE = 'START_PHASE',
  COMPLETE_PHASE = 'COMPLETE_PHASE',
  OPEN_PHASE_GATE_PANEL = 'OPEN_PHASE_GATE_PANEL',
  CREATE_OR_EDIT_PHASE_GATE_DEFINITION = 'CREATE_OR_EDIT_PHASE_GATE_DEFINITION',
  CREATE_PHASE_GATE_SUBMISSION = 'CREATE_PHASE_GATE_SUBMISSION',
  SUBMIT_PHASE_GATE_SUBMISSION = 'SUBMIT_PHASE_GATE_SUBMISSION',
  APPROVE_PHASE_GATE_SUBMISSION = 'APPROVE_PHASE_GATE_SUBMISSION',
  REJECT_PHASE_GATE_SUBMISSION = 'REJECT_PHASE_GATE_SUBMISSION',
  CREATE_CHANGE_REQUEST = 'CREATE_CHANGE_REQUEST',
  SUBMIT_CHANGE_REQUEST = 'SUBMIT_CHANGE_REQUEST',
  APPROVE_CHANGE_REQUEST = 'APPROVE_CHANGE_REQUEST',
  REJECT_CHANGE_REQUEST = 'REJECT_CHANGE_REQUEST',
  UPLOAD_DOCUMENT = 'UPLOAD_DOCUMENT',
  LINK_DOCUMENT_TO_CHANGE_REQUEST = 'LINK_DOCUMENT_TO_CHANGE_REQUEST',
  APPLY_TEMPLATE_RISK_REGISTER = 'APPLY_TEMPLATE_RISK_REGISTER',
  APPLY_TEMPLATE_PHASE_GATE_STARTER = 'APPLY_TEMPLATE_PHASE_GATE_STARTER',
  APPLY_TEMPLATE_SPRINT_STARTER = 'APPLY_TEMPLATE_SPRINT_STARTER',
  APPLY_TEMPLATE_PROJECT_STARTER = 'APPLY_TEMPLATE_PROJECT_STARTER',
}

export enum CommandConfirmType {
  NONE = 'NONE',
  CONFIRM = 'CONFIRM',
  CONFIRM_WARNINGS = 'CONFIRM_WARNINGS',
}

export enum CommandGroup {
  SUGGESTED = 'Suggested',
  ACTIONS = 'Actions',
  NAVIGATION = 'Navigation',
  TEMPLATES = 'Templates',
}

export interface CommandApiCall {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pathTemplate: string;
  bodyTemplate?: Record<string, unknown>;
}

export interface CommandWarning {
  code: string;
  message: string;
}

export interface CommandAction {
  id: CommandActionId;
  label: string;
  description?: string;
  scope: CommandScope;
  group: CommandGroup;
  requiredContext: string[];
  deepLink?: string;
  apiCall?: CommandApiCall;
  confirm: {
    required: boolean;
    type: CommandConfirmType;
    message?: string;
  };
  disabled: {
    isDisabled: boolean;
    reason?: string;
  };
  warnings: CommandWarning[];
}

export interface CommandResolverResult {
  actions: CommandAction[];
  blockedActions: CommandAction[];
  suggestedTemplates: CommandAction[];
  warnings: CommandWarning[];
}

// ─── API calls ───────────────────────────────────────────────────────────────

export interface ResolveCommandsPayload {
  route: { pathname: string; search?: string };
  entityContext?: {
    projectId?: string;
    phaseId?: string;
    taskId?: string;
    sprintId?: string;
    changeRequestId?: string;
    documentId?: string;
  };
}

export async function resolveCommands(
  payload: ResolveCommandsPayload,
): Promise<CommandResolverResult> {
  const resp = await apiClient.post<{ data?: CommandResolverResult }>('/commands/resolve', payload);
  const raw = (resp as any)?.data ?? resp;
  return raw as CommandResolverResult;
}
