import axios from 'axios';

import { normalizeAxiosError } from '@/lib/api/normalizeError';

export type ArtifactApiErrorCode =
  | 'WORKSPACE_REQUIRED'
  | 'WORKSPACE_HEADER_MISMATCH'
  | 'WORKSPACE_ACCESS_DENIED'
  | 'PROJECT_NOT_FOUND'
  | 'PROJECT_WORKSPACE_MISSING'
  | 'ARTIFACT_NOT_FOUND'
  | 'ARTIFACT_ITEM_NOT_FOUND'
  | 'ARTIFACT_TYPE_IMMUTABLE'
  | 'ARTIFACT_REORDER_MISMATCH'
  | 'ITEM_REORDER_MISMATCH'
  | 'CUSTOM_FIELD_VALIDATION'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | string;

export interface MappedArtifactApiError {
  code: ArtifactApiErrorCode;
  message: string;
  status?: number;
}

function readBodyCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const data = error.response?.data;
  if (!data || typeof data !== 'object') return undefined;
  const code = (data as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
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

/** Maps backend artifact error codes to user-facing copy (plain language, no framework names). */
export function mapArtifactApiError(error: unknown): MappedArtifactApiError {
  const bodyCode = readBodyCode(error);
  const bodyMessage = readBodyMessage(error);
  const normalized = normalizeAxiosError(error);

  const code = (bodyCode ?? normalized.code) as ArtifactApiErrorCode;

  switch (code) {
    case 'WORKSPACE_REQUIRED':
      return {
        code,
        message: 'Select a workspace before working with project artifacts.',
        status: normalized.status,
      };
    case 'WORKSPACE_HEADER_MISMATCH':
      return {
        code,
        message: 'This project does not belong to the active workspace. Switch workspace and try again.',
        status: normalized.status,
      };
    case 'WORKSPACE_ACCESS_DENIED':
      return {
        code,
        message: 'You do not have access to this workspace.',
        status: normalized.status,
      };
    case 'PROJECT_NOT_FOUND':
      return {
        code,
        message: 'Project not found or no longer available.',
        status: normalized.status,
      };
    case 'PROJECT_WORKSPACE_MISSING':
      return {
        code,
        message: 'Project workspace association is missing. Contact your administrator.',
        status: normalized.status,
      };
    case 'ARTIFACT_NOT_FOUND':
      return {
        code,
        message: 'Artifact not found or may have been removed.',
        status: normalized.status,
      };
    case 'ARTIFACT_ITEM_NOT_FOUND':
      return {
        code,
        message: 'This item no longer exists. It may have been removed.',
        status: normalized.status,
      };
    case 'ARTIFACT_TYPE_IMMUTABLE':
      return {
        code,
        message: 'Artifact type cannot be changed after creation.',
        status: normalized.status,
      };
    case 'ARTIFACT_REORDER_MISMATCH':
    case 'ITEM_REORDER_MISMATCH':
      return {
        code,
        message: 'Some items have changed since your last action. Please refresh and try again.',
        status: normalized.status,
      };
    case 'CUSTOM_FIELD_VALIDATION':
    case 'VALIDATION_ERROR':
      return {
        code,
        message: bodyMessage ?? 'Check the highlighted fields and try again.',
        status: normalized.status,
      };
    case 'NETWORK_ERROR':
      return {
        code,
        message: 'Network error. Check your connection and try again.',
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
