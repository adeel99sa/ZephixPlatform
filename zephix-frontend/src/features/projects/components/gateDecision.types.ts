/**
 * C-5: PMBOK gate decision options — must match backend {@link GateDecisionType}.
 */
export type GateDecisionOption =
  | "GO"
  | "CONDITIONAL_GO"
  | "RECYCLE"
  | "HOLD"
  | "KILL";

export type GateDecisionConditionInput = {
  description: string;
};
