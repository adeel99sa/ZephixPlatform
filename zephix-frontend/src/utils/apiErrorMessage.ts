import { PHASE5_1_COPY } from '@/constants/phase5_1.copy';

/** Normalized backend error envelope / body shape from Axios responses */
export type ApiErrorPayload = {
  code?: string;
  message?: string;
  /** Plan-limit errors may include a numeric cap */
  limit?: number | string;
};

/**
 * Maps backend error codes to locked UI messages
 * Ensures consistency across all Phase 5.1 surfaces
 */
export function getApiErrorMessage(error: ApiErrorPayload | null | undefined): string {
  if (!error) {
    return 'Something went wrong. Try again.';
  }

  const code = error.code;
  const backendMessage = error.message || '';
  const limitLabel =
    error.limit !== undefined && error.limit !== null && `${error.limit}`.length > 0
      ? String(error.limit)
      : null;

  // Map known codes to locked phrases
  switch (code) {
    case 'WORKSPACE_REQUIRED':
      return PHASE5_1_COPY.WORKSPACE_REQUIRED;

    case 'FORBIDDEN_ROLE':
      return PHASE5_1_COPY.FORBIDDEN_ROLE;

    case 'DELIVERY_OWNER_REQUIRED':
      return PHASE5_1_COPY.DELIVERY_OWNER_REQUIRED;

    case 'ACK_TOKEN_EXPIRED':
    case 'ACK_TOKEN_INVALID':
      return PHASE5_1_COPY.CONFIRMATION_EXPIRED;

    case 'WORK_PLAN_ALREADY_INITIALIZED':
      return PHASE5_1_COPY.WORK_PLAN_ALREADY_INITIALIZED;

    case 'WORK_PLAN_INVALID':
      return PHASE5_1_COPY.WORK_PLAN_INVALID;

    case 'LOCKED_PHASE_STRUCTURE':
      return PHASE5_1_COPY.LOCKED_PHASE_STRUCTURE;

    case 'SUSPENDED':
      return 'Access suspended';

    case 'CANNOT_SUSPEND_OWNER':
      return 'Cannot suspend workspace owner. Remove or demote instead.';

    case 'LAST_OWNER_PROTECTION':
    case 'LAST_OWNER_REQUIRED':
      return 'At least one owner is required';

    case 'MEMBER_NOT_FOUND':
      return 'Member not found';

    case 'LAST_ADMIN_DEMOTE_BLOCKED':
      return 'Cannot change this role — your organization must keep at least one admin.';

    case 'LAST_ADMIN_DEACTIVATE_BLOCKED':
      return 'Cannot deactivate this person — your organization must keep at least one admin.';

    case 'INVITATION_EXPIRED':
      return 'This invitation has expired. Ask your administrator to send a new one.';

    case 'INVITATION_INVALID':
    case 'INVITATION_NOT_FOUND':
      return 'This invitation link is not valid. Check the link or request a new invitation.';

    case 'INVITATION_ALREADY_ACCEPTED':
    case 'INVITATION_CONSUMED':
      return 'This invitation was already used. Sign in with your account or request a new invite.';

    case 'MFA_INVALID_CODE':
      return 'That verification code is not valid. Try again.';

    case 'MFA_ALREADY_ENROLLED':
      return 'Multi-factor authentication is already enabled on this account.';

    case 'INVALID_PASSWORD':
      return 'That password is not correct.';

    case 'PASSWORD_RESET_TOKEN_EXPIRED':
      return 'This password reset link has expired. Request a new reset email.';

    case 'PASSWORD_RESET_TOKEN_INVALID':
      return 'This password reset link is not valid. Request a new reset email.';

    case 'PASSWORD_RESET_TOKEN_USED':
    case 'PASSWORD_RESET_ALREADY_USED':
      return 'This password reset link was already used. Request a new reset email if you still need access.';

    case 'MFA_REQUIRED':
      return 'Multi-factor authentication is required to continue.';

    case 'SEAT_LIMIT_EXCEEDED':
    case 'PLAN_SEAT_CAP':
      return 'Seat limit reached. Upgrade your plan to add more people.';

    case 'MAX_USERS_LIMIT_EXCEEDED':
      return limitLabel
        ? `Your plan allows up to ${limitLabel} users. Upgrade to invite more members.`
        : 'Your plan allows up to a limited number of users. Upgrade to invite more members.';

    case 'MAX_WORKSPACES_LIMIT_EXCEEDED':
      return limitLabel
        ? `Your plan allows up to ${limitLabel} workspaces. Upgrade to create more.`
        : 'Your plan allows up to a limited number of workspaces. Upgrade to create more.';

    case 'WORKSPACE_COMPLEXITY_MODE_ADMIN_ONLY':
      return 'Only Organization Admins can change workspace complexity mode.';

    case 'PROGRAMS_NOT_AVAILABLE_FOR_TIER':
      return 'Programs are available in Governed tier workspaces only.';

    case 'ACCOUNT_LOCKED':
      return 'This account is temporarily locked. Try again later.';

    default:
      // Fallback: use backend message if short and safe, otherwise generic message
      const safeMessage = backendMessage.length <= 100 ? backendMessage : 'Something went wrong. Try again.';
      return safeMessage;
  }
}

