export interface AckRequiredResponse {
  code: 'ACK_REQUIRED';
  message: string;
  ack: {
    token: string;
    expiresAt: string;
    impactSummary: string;
    impactedEntities: Array<{
      type: 'PHASE' | 'TASK' | 'PROJECT';
      id: string;
      name?: string;
    }>;
  };
}

export interface UpdatePhaseRequest {
  name?: string;
  dueDate?: string;
}

