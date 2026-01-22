import { useState } from 'react';
import { updatePhase, WorkPhase } from '../api/phases.api';
import { UpdatePhaseRequest, AckRequiredResponse } from '../types/ack.types';
import { PHASE5_1_COPY } from '@/constants/phase5_1.copy';

interface UsePhaseUpdateReturn {
  updatePhase: (phaseId: string, updates: UpdatePhaseRequest) => Promise<void>;
  loading: boolean;
  error: { code: string; message: string } | null;
  ackRequired: AckRequiredResponse | null;
  confirmAck: (ackToken: string) => Promise<void>;
}

export function usePhaseUpdate(
  onSuccess?: (phase: WorkPhase) => void,
  onError?: (error: { code: string; message: string }) => void
): UsePhaseUpdateReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [ackRequired, setAckRequired] = useState<AckRequiredResponse | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{
    phaseId: string;
    updates: UpdatePhaseRequest;
  } | null>(null);

  const handleUpdate = async (phaseId: string, updates: UpdatePhaseRequest) => {
    setLoading(true);
    setError(null);
    setAckRequired(null);
    setPendingUpdate({ phaseId, updates });

    try {
      const result = await updatePhase(phaseId, updates);

      // Check if ack is required
      if ('ack' in result) {
        setAckRequired(result);
        setLoading(false);
        return;
      }

      // Success
      setLoading(false);
      setPendingUpdate(null);
      onSuccess?.(result as WorkPhase);
    } catch (err: any) {
      const errorCode = err?.response?.data?.code || err?.code || 'UNKNOWN_ERROR';
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update phase';

      // Handle token errors
      if (errorCode === 'ACK_TOKEN_INVALID' || errorCode === 'ACK_TOKEN_EXPIRED') {
        setError({
          code: errorCode,
          message: PHASE5_1_COPY.CONFIRMATION_EXPIRED,
        });
        // Reset ack state to allow retry
        setAckRequired(null);
        setPendingUpdate(null);
      } else {
        setError({ code: errorCode, message: errorMessage });
      }

      setLoading(false);
      onError?.({ code: errorCode, message: errorMessage });
    }
  };

  const confirmAck = async () => {
    if (!pendingUpdate || !ackRequired) return;

    const ackToken = ackRequired.ack.token;

    setLoading(true);
    setError(null);

    try {
      const result = await updatePhase(pendingUpdate.phaseId, pendingUpdate.updates, ackToken);

      // Should not get ack required again if token is valid
      if ('ack' in result) {
        setError({
          code: 'ACK_TOKEN_INVALID',
          message: PHASE5_1_COPY.CONFIRMATION_EXPIRED,
        });
        setAckRequired(null);
        setPendingUpdate(null);
      } else {
        // Success
        setAckRequired(null);
        setPendingUpdate(null);
        onSuccess?.(result as WorkPhase);
      }
    } catch (err: any) {
      const errorCode = err?.response?.data?.code || err?.code || 'UNKNOWN_ERROR';
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update phase';

      if (errorCode === 'ACK_TOKEN_INVALID' || errorCode === 'ACK_TOKEN_EXPIRED') {
        setError({
          code: errorCode,
          message: PHASE5_1_COPY.CONFIRMATION_EXPIRED,
        });
        // Reset to allow retry
        setAckRequired(null);
        setPendingUpdate(null);
      } else {
        setError({ code: errorCode, message: errorMessage });
      }

      onError?.({ code: errorCode, message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return {
    updatePhase: handleUpdate,
    loading,
    error,
    ackRequired,
    confirmAck: () => confirmAck(),
  };
}

