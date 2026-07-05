import { getErrorCode } from '@/lib/api/errors';
import { normalizeAxiosError } from '@/lib/api/normalizeError';

export type EntityLinkApiErrorCode =
  | 'LINK_ALREADY_EXISTS'
  | 'USE_DEPENDENCIES'
  | 'NOT_FOUND'
  | string;

function readErrorCode(error: unknown): EntityLinkApiErrorCode | undefined {
  const direct = getErrorCode(error);
  if (direct) return direct as EntityLinkApiErrorCode;
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { code?: string } } }).response?.data;
    if (typeof data?.code === 'string') return data.code;
  }
  return undefined;
}

export function mapEntityLinkApiError(error: unknown): {
  code: EntityLinkApiErrorCode;
  message: string;
} {
  const normalized = normalizeAxiosError(error);
  const code = (readErrorCode(error) ?? normalized.code ?? 'UNKNOWN') as EntityLinkApiErrorCode;

  if (code === 'LINK_ALREADY_EXISTS') {
    return {
      code,
      message: 'This link already exists for these items.',
    };
  }
  if (code === 'USE_DEPENDENCIES') {
    return {
      code,
      message: 'Task-to-task links use Dependencies. Add a dependency instead.',
    };
  }

  return {
    code,
    message: normalized.message || 'Could not update relations.',
  };
}
