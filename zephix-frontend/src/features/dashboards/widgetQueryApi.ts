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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown widget query failure';
    throw new Error(`Widget query failed for ${widgetId}: ${message}`);
  }
}
