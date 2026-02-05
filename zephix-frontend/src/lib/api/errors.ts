import axios from 'axios';

/**
 * Extract error message from unknown error type.
 * Use in catch blocks to safely access error message.
 */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as Record<string, unknown> | undefined;
    const msg = d?.message ?? err.message ?? 'Request failed';
    return typeof msg === 'string' ? msg : JSON.stringify(d);
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

/**
 * Extract error code from unknown error type.
 * Use in catch blocks to safely access error code.
 */
export function getErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as Record<string, unknown> | undefined;
    if (typeof d?.code === 'string') return d.code;
    if (typeof d?.errorCode === 'string') return d.errorCode;
    return err.code;
  }
  if (err instanceof Error && 'code' in err && typeof err.code === 'string') {
    return err.code;
  }
  return undefined;
}

/** @deprecated Use getErrorMessage instead */
export function getErrorText(err: unknown): string {
  return getErrorMessage(err);
}
