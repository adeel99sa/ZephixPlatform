import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePhaseUpdate } from '../usePhaseUpdate';
import * as phasesApi from '../../api/phases.api';

vi.mock('../../api/phases.api');

describe('usePhaseUpdate', () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show modal on ACK_REQUIRED and resubmit with token on confirm', async () => {
    const { result } = renderHook(() => usePhaseUpdate(mockOnSuccess, mockOnError));

    // Mock first call returning ACK_REQUIRED
    const ackResponse = {
      code: 'ACK_REQUIRED',
      message: 'Confirmation required',
      ack: {
        token: 'test-token-123',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        impactSummary: 'This change affects tracking',
        impactedEntities: [
          { type: 'PHASE', id: 'phase-1', name: 'Milestone Phase' },
        ],
      },
    };

    vi.mocked(phasesApi.updatePhase).mockResolvedValueOnce(ackResponse);

    // First update call
    await act(async () => {
      await result.current.updatePhase('phase-1', { name: 'New Name' });
    });

    await waitFor(() => {
      expect(result.current.ackRequired).toBeDefined();
      expect(result.current.ackRequired?.code).toBe('ACK_REQUIRED');
    });

    // Mock second call returning success
    const successResponse = {
      id: 'phase-1',
      name: 'New Name',
      sortOrder: 0,
      reportingKey: 'M1',
      isMilestone: true,
      startDate: null,
      dueDate: null,
      isLocked: false,
    };

    vi.mocked(phasesApi.updatePhase).mockResolvedValueOnce(successResponse);

    // Confirm ack
    await act(async () => {
      await result.current.confirmAck();
    });

    await waitFor(() => {
      expect(result.current.ackRequired).toBeNull();
      expect(mockOnSuccess).toHaveBeenCalledWith(successResponse);
    });

    // Verify API was called twice: once without token, once with token
    expect(phasesApi.updatePhase).toHaveBeenCalledTimes(2);
    expect(phasesApi.updatePhase).toHaveBeenNthCalledWith(1, 'phase-1', { name: 'New Name' }, undefined);
    expect(phasesApi.updatePhase).toHaveBeenNthCalledWith(2, 'phase-1', { name: 'New Name' }, 'test-token-123');
  });

  it('should handle ACK_TOKEN_INVALID with toast message', async () => {
    const { result } = renderHook(() => usePhaseUpdate(mockOnSuccess, mockOnError));

    const ackResponse = {
      code: 'ACK_REQUIRED',
      message: 'Confirmation required',
      ack: {
        token: 'test-token-123',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        impactSummary: 'This change affects tracking',
        impactedEntities: [],
      },
    };

    vi.mocked(phasesApi.updatePhase).mockResolvedValueOnce(ackResponse);

    await act(async () => {
      await result.current.updatePhase('phase-1', { name: 'New Name' });
    });

    // Mock invalid token error
    const error = new Error('Invalid token');
    (error as any).response = {
      data: {
        code: 'ACK_TOKEN_INVALID',
        message: 'Confirmation expired. Try again.',
      },
    };

    vi.mocked(phasesApi.updatePhase).mockRejectedValueOnce(error);

    await act(async () => {
      await result.current.confirmAck();
    });

    await waitFor(() => {
      expect(result.current.error?.code).toBe('ACK_TOKEN_INVALID');
      expect(result.current.error?.message).toBe('Confirmation expired. Try again.');
      expect(result.current.ackRequired).toBeNull();
    });
  });
});

