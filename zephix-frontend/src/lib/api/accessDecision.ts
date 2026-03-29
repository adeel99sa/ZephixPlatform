export type AccessDecision =
  | 'allowed'
  | 'forbidden'
  | 'missing'
  | 'session_expired'
  | 'unknown_error';

export type AccessEntityType = 'workspace' | 'project';

type ErrorLike = {
  status?: number;
  code?: string;
  response?: {
    status?: number;
    data?: {
      code?: string;
      message?: string;
    };
  };
};

function readStatus(error: unknown): number | undefined {
  const err = error as ErrorLike;
  return err?.response?.status ?? err?.status;
}

function readCode(error: unknown): string | undefined {
  const err = error as ErrorLike;
  return err?.response?.data?.code ?? err?.code;
}

export function normalizeAccessDecision(error: unknown): AccessDecision {
  const status = readStatus(error);
  const code = readCode(error);

  if (status === 403) return 'forbidden';
  if (status === 404) return 'missing';
  if (status === 401 || code === 'AUTH_ERROR') return 'session_expired';
  return 'unknown_error';
}

export function accessDecisionFromEntity<T>(
  entity: T | null | undefined,
): AccessDecision {
  return entity ? 'allowed' : 'missing';
}

export function accessDecisionMessage(
  decision: AccessDecision,
  entity: AccessEntityType,
): string {
  if (decision === 'forbidden') {
    return `User does not have access to this ${entity}.`;
  }
  if (decision === 'missing') {
    return `This ${entity} could not be found.`;
  }
  if (decision === 'session_expired') {
    return 'Your session expired. Please sign in again.';
  }
  return 'Something went wrong. Please try again.';
}

export function redirectToSessionExpiredLogin(returnUrl?: string): void {
  const next =
    returnUrl ||
    `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const encoded = encodeURIComponent(next);
  window.location.href = `/login?reason=session_expired&returnUrl=${encoded}`;
}
