import { describe, expect, it } from 'vitest';
import axios from 'axios';

import { mapArtifactApiError } from '../mapArtifactApiError';

function axiosErrorWithCode(code: string, message?: string) {
  return new axios.AxiosError(
    'request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status: 400,
      data: { code, message },
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    },
  );
}

describe('mapArtifactApiError', () => {
  it('maps WORKSPACE_REQUIRED', () => {
    const m = mapArtifactApiError(axiosErrorWithCode('WORKSPACE_REQUIRED'));
    expect(m.code).toBe('WORKSPACE_REQUIRED');
    expect(m.message).toMatch(/workspace/i);
  });

  it('maps WORKSPACE_HEADER_MISMATCH', () => {
    const m = mapArtifactApiError(axiosErrorWithCode('WORKSPACE_HEADER_MISMATCH'));
    expect(m.message).toMatch(/active workspace/i);
  });

  it('maps WORKSPACE_ACCESS_DENIED', () => {
    const m = mapArtifactApiError(axiosErrorWithCode('WORKSPACE_ACCESS_DENIED'));
    expect(m.message).toMatch(/access/i);
  });

  it('maps PROJECT_NOT_FOUND', () => {
    const m = mapArtifactApiError(axiosErrorWithCode('PROJECT_NOT_FOUND'));
    expect(m.message).toMatch(/project not found/i);
  });

  it('maps PROJECT_WORKSPACE_MISSING', () => {
    const m = mapArtifactApiError(axiosErrorWithCode('PROJECT_WORKSPACE_MISSING'));
    expect(m.message).toMatch(/administrator/i);
  });

  it('maps ARTIFACT_NOT_FOUND', () => {
    const m = mapArtifactApiError(axiosErrorWithCode('ARTIFACT_NOT_FOUND'));
    expect(m.message).toMatch(/artifact/i);
  });

  it('maps ARTIFACT_ITEM_NOT_FOUND', () => {
    const m = mapArtifactApiError(axiosErrorWithCode('ARTIFACT_ITEM_NOT_FOUND'));
    expect(m.message).toMatch(/no longer exists/i);
  });

  it('maps ARTIFACT_TYPE_IMMUTABLE', () => {
    const m = mapArtifactApiError(axiosErrorWithCode('ARTIFACT_TYPE_IMMUTABLE'));
    expect(m.message).toMatch(/cannot be changed/i);
  });

  it('maps ARTIFACT_REORDER_MISMATCH and ITEM_REORDER_MISMATCH with shared copy', () => {
    const a = mapArtifactApiError(axiosErrorWithCode('ARTIFACT_REORDER_MISMATCH'));
    const b = mapArtifactApiError(axiosErrorWithCode('ITEM_REORDER_MISMATCH'));
    expect(a.message).toBe(b.message);
    expect(a.message).toMatch(/refresh/i);
  });

  it('maps CUSTOM_FIELD_VALIDATION with body message when present', () => {
    const m = mapArtifactApiError(
      axiosErrorWithCode('CUSTOM_FIELD_VALIDATION', 'Probability is required'),
    );
    expect(m.message).toBe('Probability is required');
  });

  it('maps VALIDATION_ERROR with body message when present', () => {
    const m = mapArtifactApiError(
      axiosErrorWithCode('VALIDATION_ERROR', 'Name is required'),
    );
    expect(m.code).toBe('VALIDATION_ERROR');
    expect(m.message).toBe('Name is required');
  });

  it('maps VALIDATION_ERROR to default copy when body message missing', () => {
    const m = mapArtifactApiError(axiosErrorWithCode('VALIDATION_ERROR'));
    expect(m.message).toMatch(/highlighted fields/i);
  });

  it('maps NETWORK_ERROR', () => {
    const m = mapArtifactApiError(axiosErrorWithCode('NETWORK_ERROR'));
    expect(m.message).toMatch(/network error/i);
  });

  it('falls back for unknown codes', () => {
    const m = mapArtifactApiError(axiosErrorWithCode('SOME_NEW_CODE', 'Backend detail'));
    expect(m.code).toBe('SOME_NEW_CODE');
    expect(m.message).toBe('Backend detail');
  });
});
