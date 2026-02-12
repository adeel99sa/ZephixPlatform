// ─────────────────────────────────────────────────────────────────────────────
// Jira Import Panel — Step 22.6
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Download, Eye } from 'lucide-react';
import { typography } from '@/design/typography';
import { intentColors } from '@/design/tokens';
import { InlineLoadingState } from '@/components/ui/states/InlineLoadingState';
import { jiraImportPreview, jiraImportRun, type JiraImportPreview } from '../integrations.api';

interface JiraImportPanelProps {
  workspaceId: string;
  /** ID of the existing Jira connection (from legacy integration). */
  connectionId: string;
}

export const JiraImportPanel: React.FC<JiraImportPanelProps> = ({
  workspaceId,
  connectionId,
}) => {
  const [projectKey, setProjectKey] = useState('');
  const [targetName, setTargetName] = useState('');
  const [jqlFilter, setJqlFilter] = useState('');
  const [preview, setPreview] = useState<JiraImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const result = await jiraImportPreview(
        workspaceId,
        connectionId,
        projectKey || undefined,
        jqlFilter || undefined,
      );
      setPreview(result);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to preview Jira import.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!projectKey.trim() || !targetName.trim()) {
      toast.error('Project key and target name are required.');
      return;
    }

    setImporting(true);
    try {
      const result = await jiraImportRun(
        workspaceId,
        connectionId,
        projectKey,
        targetName,
        jqlFilter || undefined,
      );
      toast.success(`Imported ${result.tasksCreated} tasks into "${targetName}".`);
      setPreview(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4" data-testid="jira-import-panel">
      <div className="flex items-center gap-2">
        <Download className="h-5 w-5 text-blue-500" />
        <h3 className={typography.sectionTitle}>Import from Jira</h3>
      </div>

      <p className={typography.muted}>
        One-time import of a Jira project into Zephix. Creates a new project with tasks
        mapped from Jira issues.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Jira Project Key
          </label>
          <input
            type="text"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
            placeholder="e.g. PROJ"
            className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            data-testid="jira-project-key"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            JQL Filter (optional)
          </label>
          <input
            type="text"
            value={jqlFilter}
            onChange={(e) => setJqlFilter(e.target.value)}
            placeholder='project = "PROJ" AND status != Done'
            className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handlePreview}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          {loading ? 'Loading...' : 'Preview Import'}
        </button>
      </div>

      {/* Preview results */}
      {loading && <InlineLoadingState message="Fetching Jira data..." />}

      {preview && !loading && (
        <div className="space-y-3 border-t pt-3">
          <h4 className={typography.sectionTitle}>Preview</h4>

          {preview.projectsFound.length > 0 && (
            <div className="space-y-1">
              {preview.projectsFound.map((p) => (
                <div key={p.key} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{p.key} — {p.name}</span>
                  <span className={typography.muted}>{p.issueCount} issues</span>
                </div>
              ))}
            </div>
          )}

          {preview.totalIssues > 0 && (
            <p className={typography.body}>
              <strong>{preview.totalIssues}</strong> issues will be imported.
            </p>
          )}

          {preview.mappingSummary.statusesFound.length > 0 && (
            <div className="text-xs text-slate-600 space-y-0.5">
              <p>Statuses: {preview.mappingSummary.statusesFound.join(', ')}</p>
              <p>Types: {preview.mappingSummary.typesFound.join(', ')}</p>
              <p>Assignees: {preview.mappingSummary.assigneesFound.length}</p>
            </div>
          )}

          {preview.warnings.length > 0 && (
            <div className={`p-2 rounded text-xs ${intentColors.warning.bg} ${intentColors.warning.text} border ${intentColors.warning.border}`}>
              {preview.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          {/* Import action */}
          {preview.totalIssues > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Zephix Project Name
                </label>
                <input
                  type="text"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="My Imported Project"
                  className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  data-testid="jira-target-name"
                />
              </div>

              <button
                onClick={handleImport}
                disabled={importing || !targetName.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                data-testid="jira-import-btn"
              >
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                {importing ? 'Importing...' : `Import ${preview.totalIssues} Issues`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
