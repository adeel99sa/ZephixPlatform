import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getProject, listProjectViews } from '../api';
import type { Project, ProjectView, ProjectViewType } from '../types';
import { WorkItemListView } from './WorkItemListView';
import { getErrorMessage } from '@/lib/api/errors';

export function ProjectShellPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const [sp, setSearchParams] = useSearchParams();
  const activeView = (sp.get('view') as ProjectViewType) || 'list';

  const [project, setProject] = useState<Project | null>(null);
  const [views, setViews] = useState<ProjectView[]>([]);
  const [loading, setLoading] = useState(true);

  const enabledViews = useMemo(
    () => views.filter((v) => v.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [views],
  );

  useEffect(() => {
    if (!workspaceId || !projectId) return;

    async function load(wsId: string, projId: string) {
      try {
        setLoading(true);
        const [proj, viewList] = await Promise.all([
          getProject(wsId, projId),
          listProjectViews(wsId, projId),
        ]);
        setProject(proj);
        setViews(viewList);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    load(workspaceId, projectId);
  }, [workspaceId, projectId]);

  if (!workspaceId || !projectId) {
    return <div>Missing workspace or project ID</div>;
  }

  if (loading) {
    return <div style={{ padding: 16 }}>Loading...</div>;
  }

  if (!project) {
    return <div style={{ padding: 16 }}>Project not found</div>;
  }

  const handleViewChange = (viewType: ProjectViewType) => {
    setSearchParams({ view: viewType });
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{project.name}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => alert('Add view modal next')}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: 'white' }}
          >
            + View
          </button>
          <button
            type="button"
            onClick={() => alert('Create work item shortcut next')}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: 'white' }}
          >
            + Task
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 12,
          borderBottom: '1px solid #eee',
          paddingBottom: 8,
        }}
      >
        {enabledViews.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => handleViewChange(v.type)}
            style={{
              textDecoration: 'none',
              padding: '6px 10px',
              borderRadius: 8,
              background: activeView === v.type ? '#f2f2f2' : 'transparent',
              color: '#111',
              fontWeight: activeView === v.type ? 700 : 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {v.name}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        {activeView === 'list' && <WorkItemListView workspaceId={workspaceId} projectId={projectId} />}
        {activeView !== 'list' && (
          <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
            View disabled in MVP. Enable later.
          </div>
        )}
      </div>
    </div>
  );
}
