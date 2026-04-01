import { AlertTriangle, GitBranch } from 'lucide-react';
import type { TaskDetailDto } from '../../api/taskDetail.api';

interface Props {
  detail: TaskDetailDto;
}

export function WorkItemLinksTab({ detail }: Props) {
  const linksCount = detail.risks.length + detail.changeRequests.length;

  return (
    <div className="p-4 space-y-4">
      {linksCount === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No linked risks or change requests</p>
      ) : (
        <>
          {detail.risks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-orange-600 uppercase mb-2">Risks ({detail.risks.length})</h4>
              <div className="space-y-1">
                {detail.risks.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded border p-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">{r.title}</span>
                    </div>
                    <span className="text-xs text-gray-500">{r.severity} · {r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {detail.changeRequests.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-blue-600 uppercase mb-2">Change Requests ({detail.changeRequests.length})</h4>
              <div className="space-y-1">
                {detail.changeRequests.map((cr) => (
                  <div key={cr.id} className="flex items-center justify-between rounded border p-2">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">{cr.title}</span>
                    </div>
                    <span className="text-xs text-gray-500">{cr.type} · {cr.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}