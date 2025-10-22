import { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import ProjectsSection from './ProjectsSection';

export default function HubPage() {
  const { workspaceId } = useUIStore();
  const [params] = useSearchParams();
  
  // Router-safe view handling
  const view = (params.get('view') ?? 'overview') as 'overview' | 'projects';
  const safeView = view === 'projects' ? 'projects' : 'overview';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Hub</h1>
      <p className="text-sm text-gray-500">Workspace: {workspaceId}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card title="Active Projects" value="—" />
        <Card title="At-Risk" value="—" />
        <Card title="Utilization" value="—" />
      </div>

      <Suspense fallback={<div className="text-sm text-gray-400">Loading recent activity…</div>}>
        {safeView === 'projects' ? (
          <ProjectsSection />
        ) : (
          <div className="rounded-xl border p-4">Recent activity will show here.</div>
        )}
      </Suspense>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs uppercase text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
