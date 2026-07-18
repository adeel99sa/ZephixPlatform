import { intentColors } from "@/design/tokens";

export type GovernancePolicySeverity = "WARN" | "BLOCK" | string;
export type GovernancePolicyVerdict = "ALLOW" | "WARN" | "BLOCK" | null;

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
    return `${intentColors.danger.border} ${intentColors.danger.bg} ${intentColors.danger.text}`;
  }
  if (normalized === "WARN") {
    return `${intentColors.warning.border} ${intentColors.warning.bg} ${intentColors.warning.text}`;
  }
  return `${intentColors.neutral.border} ${intentColors.neutral.bg} ${intentColors.neutral.text}`;
}

/** Verdict badge classes — Warn = warning tint, Block = danger tint (design tokens only). */
export function verdictBadgeClass(verdict: GovernancePolicyVerdict): string {
  if (verdict === "BLOCK") {
    return `${intentColors.danger.border} ${intentColors.danger.bg} ${intentColors.danger.text}`;
  }
  if (verdict === "WARN") {
    return `${intentColors.warning.border} ${intentColors.warning.bg} ${intentColors.warning.text}`;
  }
  return `${intentColors.neutral.border} ${intentColors.neutral.bg} ${intentColors.neutral.text}`;
}

export function verdictDisplayLabel(verdict: Exclude<GovernancePolicyVerdict, null>): string {
  switch (verdict) {
    case "BLOCK":
      return "Block";
    case "WARN":
      return "Warn";
    case "ALLOW":
      return "Allow";
    default:
      return verdict;
  }
}

export function formatPolicyParamChip(
  param: { label: string; value: string | number | boolean | null; unit: string | null },
): string {
  const value =
    param.value === null || param.value === undefined ? "—" : String(param.value);
  const unit = param.unit?.trim() ? ` ${param.unit.trim()}` : "";
  return `${param.label}: ${value}${unit}`;
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
