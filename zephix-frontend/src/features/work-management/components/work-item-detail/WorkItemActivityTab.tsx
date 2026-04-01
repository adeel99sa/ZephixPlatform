import { Activity } from 'lucide-react';
import type { TaskDetailDto } from '../../api/taskDetail.api';

function formatTime(d?: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  detail: TaskDetailDto;
}

export function WorkItemActivityTab({ detail }: Props) {
  return (
    <div className="p-4">
      {detail.activity.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
      ) : (
        <div className="space-y-3">
          {detail.activity.map((a) => (
            <div key={a.id} className="flex gap-3 text-sm">
              <Activity className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-700">{a.activityType.replace(/_/g, ' ').toLowerCase()}</p>
                <p className="text-[10px] text-gray-400">{formatTime(a.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}