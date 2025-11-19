import { api } from '@/lib/api';

export type WidgetResult =
  | { type: 'kpi'; value: number; delta?: number; trend?: 'up'|'down'|'flat' }
  | { type: 'table'; columns: string[]; rows: Array<Record<string, any>> }
  | { type: 'trend'; series: Array<{ x: string | number; y: number }> }
  | { type: 'note'; text: string };

export async function runWidgetQuery(widgetId: string, config: any, filters: any): Promise<WidgetResult> {
  try {
    const res = await api.post('/api/widgets/query', { widgetId, config, filters });
    // tolerate both envelope & flat
    return res?.data?.data ?? res?.data;
  } catch (e) {
    // never throw to avoid blocking render – return safe fallback by type
    const t = config?.type ?? 'note';
    if (t === 'kpi') return { type: 'kpi', value: 0, delta: 0, trend: 'flat' };
    if (t === 'table') return { type: 'table', columns: [], rows: [] };
    if (t === 'trend') return { type: 'trend', series: [] };
    return { type: 'note', text: 'No data' };
  }
}
