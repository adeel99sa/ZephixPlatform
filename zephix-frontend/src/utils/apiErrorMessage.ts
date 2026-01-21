import { PHASE5_1_COPY } from '@/constants/phase5_1.copy';

/**
 * Maps backend error codes to locked UI messages
 * Ensures consistency across all Phase 5.1 surfaces
 */
export function getApiErrorMessage(
  error: { code?: string; message?: string } | null | undefined
): string {
  if (!error) {
    return 'Something went wrong. Try again.';
  }

  const code = error.code;
  const backendMessage = error.message || '';

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

    default:
      // Fallback: use backend message if short and safe, otherwise generic message
      const safeMessage = backendMessage.length <= 100 ? backendMessage : 'Something went wrong. Try again.';
      return safeMessage;
  }
}

