import { GOVERNANCE_ROADMAP_BADGE_TOOLTIP } from '../constants/governance-policies';

export function GovernanceRoadmapBadge(): JSX.Element {
  return (
    <span
      className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium text-[#6B7280]"
      style={{ backgroundColor: '#F3F4F6', borderRadius: 4 }}
      title={GOVERNANCE_ROADMAP_BADGE_TOOLTIP}
    >
      Coming Q3
    </span>
  );
}
