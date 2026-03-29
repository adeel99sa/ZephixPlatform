import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { listTasks, type WorkTask } from '@/features/work-management/workTasks.api';

function formatDateKey(input: string | null | undefined): string | null {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export const ProjectCalendarTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = React.useState<WorkTask[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    setLoading(true);
    listTasks({ projectId, limit: 300, sortBy: 'dueDate', sortDir: 'asc' })
      .then((result) => {
        if (!mounted) return;
        setTasks(result.items || []);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, WorkTask[]>();
    for (const task of tasks) {
      const key = formatDateKey(task.dueDate || task.startDate);
      if (!key) continue;
      map.set(key, [...(map.get(key) || []), task]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-slate-700" />
        <h3 className="text-lg font-semibold text-slate-900">Calendar</h3>
      </div>
      {groupedByDay.length === 0 ? (
        <p className="text-sm text-slate-500">No scheduled tasks yet.</p>
      ) : (
        <div className="space-y-3">
          {groupedByDay.map(([day, dayTasks]) => (
            <div key={day} className="rounded border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{day}</p>
              <ul className="mt-2 space-y-1">
                {dayTasks.map((task) => (
                  <li key={task.id} className="text-sm text-slate-800">
                    {task.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectCalendarTab;
