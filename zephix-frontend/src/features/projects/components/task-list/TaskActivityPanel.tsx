import type { TaskActivityItem } from './types';

interface Props {
  activities: TaskActivityItem[];
  formatActivity: (activity: TaskActivityItem) => string;
}

export function TaskActivityPanel({ activities, formatActivity }: Props) {
  return (
    <div className="mt-3 pt-3 border-t">
      <h4 className="text-sm font-medium mb-2">Activity</h4>
      <div className="space-y-2">
        {activities.map((activity) => (
          <div key={activity.id} className="text-xs text-gray-600">
            <span className="font-medium">{formatActivity(activity)}</span>
            <span className="text-gray-400 ml-2">
              {new Date(activity.createdAt).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}