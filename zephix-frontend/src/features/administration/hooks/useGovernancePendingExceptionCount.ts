import { useCallback, useEffect, useState } from "react";

import { administrationApi } from "@/features/administration/api/administration.api";

/** PENDING exception count for admin sidebar / tab badges. */
export function useGovernancePendingExceptionCount(enabled = true): {
  count: number;
  refresh: () => Promise<void>;
} {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const { meta } = await administrationApi.listPendingDecisions({
        page: 1,
        limit: 1,
      });
      setCount(meta?.total ?? 0);
    } catch {
      setCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { count, refresh };
}
