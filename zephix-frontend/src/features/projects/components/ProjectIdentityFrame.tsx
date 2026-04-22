/**
 * Phase 5A.6 — Workspace-owned project identity band (primary hierarchy signal).
 * Breadcrumb stays secondary; this frame carries workspace → project truth at a glance.
 */
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Briefcase, Calendar, Users } from 'lucide-react';
import { listWorkspaceMembers, type WorkspaceMember } from '@/features/workspaces/workspace.api';
import type { ProjectDetail } from '../projects.api';
import type { ProjectOverview } from '../model/projectOverview';

export interface ProjectIdentityFrameProps {
  workspaceDisplayName: string | null;
  workspaceId: string;
  project: ProjectDetail;
  overview: ProjectOverview | null;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return 'Not set';
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Not set';
  }
}

function memberName(m: WorkspaceMember): string {
  if (m.name) return m.name;
  if (m.user?.firstName || m.user?.lastName) {
    return `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim();
  }
  return m.user?.email || m.email || 'Unknown';
}

export function ProjectIdentityFrame({
  workspaceDisplayName,
  workspaceId,
  project,
  overview,
}: ProjectIdentityFrameProps) {
  const [members, setMembers] = useState<WorkspaceMember[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listWorkspaceMembers(workspaceId)
      .then((rows) => {
        if (!cancelled) setMembers(rows || []);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const pmId = overview?.deliveryOwnerUserId ?? project.projectManagerId ?? null;
  const projectManager = pmId
    ? members?.find((m) => m.userId === pmId || m.user?.id === pmId)
    : null;

  const start =
    overview?.dateRange?.startDate ?? project.startDate ?? null;
  const target =
    overview?.dateRange?.dueDate ??
    project.endDate ??
    project.estimatedEndDate ??
    null;

  const teamCount = project.teamMemberIds?.length ?? 0;
  // Lifecycle and status pills removed — phase visible in Activities table.

  return (
    <div
      className="min-w-0 flex-1 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-white px-5 py-4 shadow-sm"
      data-testid="project-identity-frame"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-indigo-600/90">
        In workspace{' '}
        <Link
          to={`/workspaces/${workspaceId}/home`}
          className="font-semibold text-indigo-700 hover:text-indigo-900 underline-offset-2 hover:underline"
        >
          {workspaceDisplayName ?? 'Unknown workspace'}
        </Link>
      </p>

      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 truncate">
        {project.name}
      </h1>

      {project.description?.trim() && (
        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{project.description}</p>
      )}

      {project.methodology && (
        <div className="mt-3">
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-blue-900">
            {project.methodology}
          </span>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="flex gap-2">
          <Briefcase className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
          <div>
            <dt className="text-xs font-medium text-slate-500">Project manager</dt>
            <dd className="font-medium text-slate-900">
              {projectManager ? memberName(projectManager) : pmId ? 'Assigned' : 'Not assigned'}
            </dd>
          </div>
        </div>
        <div className="flex gap-2">
          <Users className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
          <div>
            <dt className="text-xs font-medium text-slate-500">Team</dt>
            <dd className="font-medium text-slate-900">
              {teamCount === 0 ? 'No members yet' : `${teamCount} member${teamCount !== 1 ? 's' : ''}`}
            </dd>
          </div>
        </div>
        <div className="flex gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
          <div>
            <dt className="text-xs font-medium text-slate-500">Start</dt>
            <dd className="font-medium text-slate-900">{formatDate(start)}</dd>
          </div>
        </div>
        <div className="flex gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
          <div>
            <dt className="text-xs font-medium text-slate-500">Target</dt>
            <dd className="font-medium text-slate-900">{formatDate(target)}</dd>
          </div>
        </div>
      </dl>

      {overview && (
        <p className="mt-3 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Structure:</span>{' '}
          {overview.structureLocked
            ? 'Locked for this project — adjust only per your organization governance rules.'
            : 'Editable as delivery evolves; sensitive reporting changes may still ask for confirmation.'}
        </p>
      )}
    </div>
  );
}
