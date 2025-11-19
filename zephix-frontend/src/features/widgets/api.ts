import { api } from "@/lib/api";
export const queryWidgets = (widgets: any[], filters: any, signal?: AbortSignal) =>
  api.post(`/widgets/query`, { widgets, filters }, { signal });
