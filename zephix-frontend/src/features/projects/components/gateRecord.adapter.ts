/**
 * Maps GET /work/projects/:projectId/phases/:phaseId/gate/record onto {@link GateRecordViewModel}.
 * No inference — unknown fields are dropped; cycles stay cycle-scoped.
 *
 * **Contract:** This is the only input for gate **history** in the UI. Do not merge with live
 * `GET …/gate` (inline gate), `listProjectApprovals`, or approval detail to build audit/history.
 */
import type { GateRecordCycle, GateRecordViewModel } from "./gateRecord.types";

function asRecord(x: unknown): Record<string, unknown> | null {
  if (x && typeof x === "object") {
    return x as Record<string, unknown>;
  }
  return null;
}

function str(v: unknown): string | null {
  if (v == null) {
    return null;
  }
  const s = String(v);
  return s.length ? s : null;
}

/** Resolve display names: prefer backend string; else workspace member map; else short id. */
function buildNameResolver(
  memberLookup: Map<string, { label: string }>,
): (userId: string) => string | null {
  return (userId: string) => {
    const m = memberLookup.get(userId);
    if (m?.label) {
      return m.label;
    }
    return userId.length > 8 ? `${userId.slice(0, 8)}…` : userId;
  };
}

export function normalizeGateRecordPayload(
  raw: unknown,
  memberLookup: Map<string, { label: string }>,
): GateRecordViewModel | null {
  const root = asRecord(raw);
  if (!root) {
    return null;
  }
  const gate = asRecord(root.gate);
  const cyclesRaw = root.cycles;
  if (!gate || !Array.isArray(cyclesRaw)) {
    return null;
  }

  const gateId = str(gate.id);
  const gateName = str(gate.name);
  const reviewState = str(gate.reviewState);
  if (!gateId || !gateName || !reviewState) {
    return null;
  }

  const totalCycles =
    typeof gate.totalCycles === "number" && Number.isFinite(gate.totalCycles)
      ? gate.totalCycles
      : cyclesRaw.length;

  const current = asRecord(gate.currentCycle ?? gate.current_cycle);
  const currentCycleNumber =
    current && typeof current.cycleNumber === "number"
      ? current.cycleNumber
      : current && typeof current.cycle_number === "number"
        ? current.cycle_number
        : null;
  const currentCycleState =
    current && typeof current.cycleState === "string"
      ? current.cycleState
      : current && typeof current.cycle_state === "string"
        ? current.cycle_state
        : null;

  const resolveName = buildNameResolver(memberLookup);

  const cycles: GateRecordCycle[] = cyclesRaw.map((c) => {
    const row = asRecord(c) ?? {};
    const approversRaw = Array.isArray(row.approvers) ? row.approvers : [];
    const historyRaw = Array.isArray(row.approvalHistory)
      ? row.approvalHistory
      : Array.isArray(row.approval_history)
        ? row.approval_history
        : [];

    const approvers = approversRaw.map((a) => {
      const ar = asRecord(a) ?? {};
      const decisionsRaw = Array.isArray(ar.decisions) ? ar.decisions : [];
      return {
        stepId: String(ar.stepId ?? ar.step_id ?? ""),
        name: String(ar.name ?? "Approver step"),
        role: String(ar.role ?? ""),
        status: String(ar.status ?? ""),
        approvalType: String(ar.approvalType ?? ar.approval_type ?? ""),
        minApprovals:
          typeof ar.minApprovals === "number"
            ? ar.minApprovals
            : typeof ar.min_approvals === "number"
              ? ar.min_approvals
              : 0,
        decisions: decisionsRaw.map((d) => {
          const dr = asRecord(d) ?? {};
          const userId = String(dr.userId ?? dr.user_id ?? "");
          return {
            userId,
            actorDisplayName: str(dr.actorDisplayName ?? dr.actor_display_name) ?? resolveName(userId),
            decision: String(dr.decision ?? ""),
            note: dr.note != null ? String(dr.note) : null,
            decidedAt: String(dr.decidedAt ?? dr.decided_at ?? ""),
          };
        }),
      };
    });

    const approvalHistory = historyRaw.map((h) => {
      const hr = asRecord(h) ?? {};
      const userId = String(hr.userId ?? hr.user_id ?? "");
      return {
        userId,
        actorDisplayName: str(hr.actorDisplayName ?? hr.actor_display_name) ?? resolveName(userId),
        decision: String(hr.decision ?? ""),
        note: hr.note != null ? String(hr.note) : null,
        decidedAt: String(hr.decidedAt ?? hr.decided_at ?? ""),
      };
    });

    const docsRaw = Array.isArray(row.submittedArtifacts)
      ? row.submittedArtifacts
      : Array.isArray(row.submitted_artifacts)
        ? row.submitted_artifacts
        : [];

    return {
      cycleNumber:
        typeof row.cycleNumber === "number"
          ? row.cycleNumber
          : typeof row.cycle_number === "number"
            ? row.cycle_number
            : 0,
      cycleId: str(row.cycleId ?? row.cycle_id),
      cycleState: String(row.cycleState ?? row.cycle_state ?? ""),
      submissionId: str(row.submissionId ?? row.submission_id),
      submissionStatus: str(row.submissionStatus ?? row.submission_status),
      submittedAt: str(row.submittedAt ?? row.submitted_at),
      submittedByUserName:
        str(row.submittedByUserName ?? row.submitted_by_user_name) ??
        (str(row.submittedByUserId ?? row.submitted_by_user_id)
          ? resolveName(String(row.submittedByUserId ?? row.submitted_by_user_id))
          : null),
      submissionNotes: str(
        row.submissionNotes ?? row.submission_notes ?? row.submission_note,
      ),
      submittedArtifacts: docsRaw
        .map((doc) => {
          const dr = asRecord(doc);
          if (!dr?.id) {
            return null;
          }
          return {
            id: String(dr.id),
            title: String(dr.title ?? dr.fileName ?? "Document"),
            fileName: dr.fileName != null ? String(dr.fileName) : undefined,
            tags: Array.isArray(dr.tags) ? (dr.tags as string[]) : undefined,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null),
      decidedAt: str(row.decidedAt ?? row.decided_at),
      decidedByUserName:
        str(row.decidedByUserName ?? row.decided_by_user_name) ??
        (str(row.decidedByUserId ?? row.decided_by_user_id)
          ? resolveName(String(row.decidedByUserId ?? row.decided_by_user_id))
          : null),
      gateDecision: str(row.gateDecision ?? row.gate_decision),
      decisionNotes: str(row.decisionNotes ?? row.decision_note),
      approvers,
      approvalHistory,
    };
  });

  const cyclesNewestFirst = [...cycles].reverse();

  return {
    summary: {
      gateId,
      gateName,
      reviewState,
      totalCycles,
      currentCycleNumber,
      currentCycleState,
    },
    cyclesNewestFirst,
  };
}
