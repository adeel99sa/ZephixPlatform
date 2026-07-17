/**
 * TEMPLATE-UX-1 — FE labels for the five canonical phase-transition gate keys
 * (AGILE-1 locked vocabulary). Not a full W2 catalog — only the keys that
 * appear on template phase edges in the process map.
 */
export const CANONICAL_PHASE_GATE_LABELS: Readonly<Record<string, string>> = {
  'platform.gate.init-to-plan': 'Initiation → Planning',
  'platform.gate.plan-to-exec': 'Planning → Execution',
  'platform.gate.exec-to-monitor': 'Execution → Monitoring',
  'platform.gate.monitor-to-closure': 'Monitoring → Closure',
  'platform.gate.closure-to-closed': 'Closure → Closed',
};

export function gateLabel(gateKey: string | null | undefined): string {
  if (!gateKey) return '';
  return CANONICAL_PHASE_GATE_LABELS[gateKey] ?? gateKey.replace(/^platform\.gate\./, '');
}
