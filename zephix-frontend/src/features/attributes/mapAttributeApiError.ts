import axios from 'axios';

import { getErrorCode } from '@/lib/api/errors';
import { normalizeAxiosError } from '@/lib/api/normalizeError';

export type AttributeApiErrorCode =
  | 'ATTRIBUTE_LOCKED_BY_HIGHER_TIER'
  | 'ATTRIBUTE_TYPE_MISMATCH'
  | string;

export interface MappedAttributeApiError {
  code: AttributeApiErrorCode;
  message: string;
  status?: number;
}

function readBodyMessage(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const data = error.response?.data;
  if (!data || typeof data !== 'object') return undefined;
  const message = (data as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) return message.filter((m) => typeof m === 'string').join(' ');
  return undefined;
}

/** Maps backend attribute error codes to user-facing copy. */
export function mapAttributeApiError(error: unknown): MappedAttributeApiError {
  const bodyMessage = readBodyMessage(error);
  const normalized = normalizeAxiosError(error);
  const code = (getErrorCode(error) ?? normalized.code) as AttributeApiErrorCode;

  switch (code) {
    case 'ATTRIBUTE_LOCKED_BY_HIGHER_TIER':
      return {
        code,
        message:
          bodyMessage ??
          'This attribute is locked by a higher tier and cannot be changed at workspace level.',
        status: normalized.status,
      };
    case 'ATTRIBUTE_TYPE_MISMATCH':
      return {
        code,
        message: bodyMessage ?? 'Value does not match the attribute type.',
        status: normalized.status,
      };
    default:
      return {
        code,
        message: bodyMessage ?? normalized.message ?? 'Something went wrong. Try again.',
        status: normalized.status,
      };
  }
}

export function isAttributeTypeMismatch(error: unknown): boolean {
  return getErrorCode(error) === 'ATTRIBUTE_TYPE_MISMATCH';
}
