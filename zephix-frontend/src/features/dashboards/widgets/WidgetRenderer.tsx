import { fmtPercent, trendArrow } from "./format";

type Widget =
  | { id: string; type: 'kpi'; label: string; value: string; trend?: string }
  | { id: string; type: 'note'; text: string }
  | { id: string; type: 'table'; columns: string[]; rows: string[][] }
  | { id: string; type: 'chart'; chartType: 'line' | 'bar'; series: number[] };

type Props = { widget: Widget; data?: any };

export function WidgetRenderer({ widget, data }: Props) {
  if (widget.type === 'kpi') {
    const label = widget.config?.label ?? 'KPI';
    const val = typeof data?.value === 'number' ? data.value : 0;
    const trend = data?.trend;
    const error = data?.error;
    const formatted = Number.isFinite(val) ? val.toLocaleString() : '0';

    if (error) {
      return (
        <div data-testid={`widget-${widget.id}`} className="p-4 border rounded">
          <div className="text-sm text-neutral-400">Projects — unavailable</div>
        </div>
      );
    }

    return (
      <div data-testid={`widget-${widget.id}`} className="p-4 border rounded flex flex-col gap-1">
        <div className="text-sm text-neutral-600">{label}</div>
        <div className="text-3xl font-semibold">{formatted}</div>
        {trend && <div className="text-xs text-neutral-500">{trendArrow(trend)}</div>}
      </div>
    );
  }

  if (widget.type === 'note') {
    const d = data ?? { text: widget.text ?? 'Note' };
    return (
      <div className="rounded-lg border p-3 shadow-sm" data-testid={`widget-${widget.id}`}>
        <div className="whitespace-pre-wrap text-sm">{d.text}</div>
      </div>
    );
  }

  if (widget.type === 'table') {
    const d = data ?? { columns: widget.columns ?? [], rows: widget.rows ?? [] };
    return (
      <div className="rounded-lg border p-3 shadow-sm" data-testid={`widget-${widget.id}`}>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr>{d.columns.map((c: string) => <th key={c} className="px-2 py-1 text-left">{c}</th>)}</tr>
            </thead>
            <tbody>
              {d.rows.map((r: any, i: number) => (
                <tr key={i} className="even:bg-neutral-50 hover:bg-neutral-100">
                  {d.columns.map((c: string, j: number) => <td key={`${i}-${j}`} className="px-2 py-1 truncate">{r[c]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (widget.type === 'chart') {
    const d = data ?? { chartType: widget.chartType ?? 'line', series: widget.series ?? [] };
    return (
      <div className="rounded-lg border p-3 shadow-sm" data-testid={`widget-${widget.id}`}>
        <div className="text-xs text-neutral-500 mb-1">Chart ({d.chartType})</div>
        <div className="text-sm">{JSON.stringify(d.series)}</div>
      </div>
    );
  }

  return <div className="rounded-lg border p-3 shadow-sm text-sm">Unknown widget</div>;
}
