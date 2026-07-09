export type GovernancePolicySeverity = "WARN" | "BLOCK" | string;

export type GovernancePolicySource = "workspace" | "bundle" | "disabled";

export const NUMERIC_POLICY_PARAM_KEYS = [
  "minEvidence",
  "maxOpenRisks",
  "maxActiveTasks",
] as const;

export type NumericPolicyParamKey = (typeof NUMERIC_POLICY_PARAM_KEYS)[number];

export function isNumericPolicyParamKey(key: string): key is NumericPolicyParamKey {
  return (NUMERIC_POLICY_PARAM_KEYS as readonly string[]).includes(key);
}

export function formatPendingAgeFromHours(ageHours: number | null | undefined): string {
  if (ageHours == null || !Number.isFinite(ageHours) || ageHours < 0) return "—";
  const hours = Math.floor(ageHours);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function isPendingAgeStale(ageHours: number | null | undefined): boolean {
  return typeof ageHours === "number" && Number.isFinite(ageHours) && ageHours > 72;
}

export function severityChipClass(severity: GovernancePolicySeverity): string {
  const normalized = String(severity).toUpperCase();
  if (normalized === "BLOCK") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (normalized === "WARN") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-neutral-200 bg-neutral-100 text-neutral-700";
}

export function sourceIndicatorLabel(source: GovernancePolicySource): string {
  switch (source) {
    case "workspace":
      return "Workspace override";
    case "bundle":
      return "Mode default";
    case "disabled":
      return "Disabled";
    default:
      return source;
  }
}
