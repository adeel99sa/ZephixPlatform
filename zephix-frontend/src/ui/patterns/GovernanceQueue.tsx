import { useMemo, useState } from "react";
import { DetailSidePanel } from "./DetailSidePanel";

export type GovernanceQueueItem = {
  id: string;
  title: string;
  status: "pending" | "approved" | "rejected" | "blocked";
  approver: string;
  dueDate: string;
  dependencyStatus: "ready" | "missing";
};

type GovernanceQueueProps = {
  items: GovernanceQueueItem[];
};

export function GovernanceQueue({ items }: GovernanceQueueProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<GovernanceQueueItem | null>(null);

  const rows = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((row) => row.status === statusFilter);
  }, [items, statusFilter]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Governance Queue</h3>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="blocked">Blocked</option>
        </select>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-2 py-2 text-xs uppercase text-slate-500">Item</th>
              <th className="px-2 py-2 text-xs uppercase text-slate-500">Status</th>
              <th className="px-2 py-2 text-xs uppercase text-slate-500">Approver</th>
              <th className="px-2 py-2 text-xs uppercase text-slate-500">Due</th>
              <th className="px-2 py-2 text-xs uppercase text-slate-500">Dependencies</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelected(item)}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-2 py-2">{item.title}</td>
                <td className="px-2 py-2">{item.status}</td>
                <td className="px-2 py-2">{item.approver}</td>
                <td className="px-2 py-2">{item.dueDate}</td>
                <td className="px-2 py-2">{item.dependencyStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailSidePanel
        open={Boolean(selected)}
        title={selected?.title || "Item details"}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium">Status:</span> {selected.status}
            </p>
            <p>
              <span className="font-medium">Approver:</span> {selected.approver}
            </p>
            <p>
              <span className="font-medium">Due Date:</span> {selected.dueDate}
            </p>
            <p>
              <span className="font-medium">Dependency Status:</span>{" "}
              {selected.dependencyStatus}
            </p>
          </div>
        ) : null}
      </DetailSidePanel>
    </section>
  );
}

