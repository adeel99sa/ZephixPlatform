import type { ReactNode } from "react";

import {
  useEffectiveRole,
  type EffectiveAction,
  type EffectivePlatformRoleLower,
} from "@/utils/access/useEffectiveRole";

export type RoleGateProps = {
  children: ReactNode;
  /** User matches any of these lowercase platform roles. */
  roles?: EffectivePlatformRoleLower[];
  /** When set, `can(capability)` must also pass (AND with `roles` when both provided). */
  capability?: EffectiveAction | (string & {});
  fallback?: ReactNode;
};

/**
 * Single primitive for conditional UI by platform role and/or capability token.
 * Prefer this + `useEffectiveRole` over ad-hoc role string checks (Rule A).
 */
export function RoleGate({
  children,
  roles,
  capability,
  fallback = null,
}: RoleGateProps): ReactNode {
  const { can, is } = useEffectiveRole();

  let show = true;

  if (roles && roles.length > 0) {
    show = roles.some((r) => is(r));
  }

  if (capability) {
    show = show && can(capability as EffectiveAction);
  }

  if (!show) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
