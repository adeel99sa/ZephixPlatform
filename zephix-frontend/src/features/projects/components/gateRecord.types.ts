/**
 * C-7: Normalized view model for GateRecordModal — populated only from GET …/gate/record
 * via {@link normalizeGateRecordPayload}.
 */

export type GateRecordApproverStep = {
  stepId: string;
  name: string;
  role: string;
  status: string;
  approvalType: string;
  minApprovals: number;
  decisions: Array<{
    userId: string;
    actorDisplayName: string | null;
    decision: string;
    note: string | null;
    decidedAt: string;
  }>;
};

export type GateRecordCycle = {
  cycleNumber: number;
  cycleId: string | null;
  cycleState: string;
  submissionId: string | null;
  submissionStatus: string | null;
  submittedAt: string | null;
  submittedByUserName: string | null;
  submissionNotes: string | null;
  submittedArtifacts: Array<{
    id: string;
    title: string;
    fileName?: string;
    tags?: string[];
  }>;
  decidedAt: string | null;
  decidedByUserName: string | null;
  gateDecision: string | null;
  decisionNotes: string | null;
  approvers: GateRecordApproverStep[];
  approvalHistory: Array<{
    userId: string;
    actorDisplayName: string | null;
    decision: string;
    note: string | null;
    decidedAt: string;
  }>;
};

export type GateRecordSummary = {
  gateId: string;
  gateName: string;
  reviewState: string;
  totalCycles: number;
  currentCycleNumber: number | null;
  currentCycleState: string | null;
};

export type GateRecordViewModel = {
  summary: GateRecordSummary;
  /** Newest cycle first. */
  cyclesNewestFirst: GateRecordCycle[];
};
