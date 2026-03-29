import { describe, expect, it } from "vitest";

import { normalizeAccessDecision } from "../accessDecision";

describe('access decision normalization contract', () => {
  it('maps 403 to forbidden', () => {
    const decision = normalizeAccessDecision({
      response: { status: 403 },
    });
    expect(decision).toBe('forbidden');
  });

  it('maps 404 to missing', () => {
    const decision = normalizeAccessDecision({
      response: { status: 404 },
    });
    expect(decision).toBe('missing');
  });

  it('maps session expired to session_expired', () => {
    expect(
      normalizeAccessDecision({
        response: { status: 401 },
      }),
    ).toBe('session_expired');

    expect(
      normalizeAccessDecision({
        code: 'AUTH_ERROR',
      }),
    ).toBe('session_expired');
  });

  it('maps other errors to unknown_error', () => {
    const decision = normalizeAccessDecision({
      response: { status: 500 },
    });
    expect(decision).toBe('unknown_error');
  });
});
