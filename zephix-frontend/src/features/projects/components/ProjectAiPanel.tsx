/**
 * ProjectAiPanel — UX Step 12
 *
 * Read-only AI suggestions panel for a project.
 * Shows preset queries that map to cmd+K action IDs.
 * AI never writes without explicit user trigger.
 */

import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  Target,
  Repeat,
  Loader2,
  ChevronRight,
  X,
  Info,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useWorkspaceStore } from '@/state/workspace.store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AiSuggestion {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  actionId: string; // maps to cmd+K action
}

interface SuggestionResult {
  summary: string;
  items: Array<{
    taskId?: string;
    title: string;
    reason: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Preset suggestions                                                 */
/* ------------------------------------------------------------------ */

const PRESET_SUGGESTIONS: AiSuggestion[] = [
  {
    id: 'blocked',
    label: 'What is blocked?',
    description: 'Find tasks blocked by dependencies or missing inputs.',
    icon: AlertTriangle,
    actionId: 'AI_BLOCKED_TASKS',
  },
  {
    id: 'overdue',
    label: 'What is overdue?',
    description: 'List tasks past their due date.',
    icon: Clock,
    actionId: 'AI_OVERDUE_TASKS',
  },
  {
    id: 'next',
    label: 'What should I do next?',
    description: 'Prioritized next actions based on project state.',
    icon: Target,
    actionId: 'AI_NEXT_ACTIONS',
  },
  {
    id: 'sprint-plan',
    label: 'Create sprint plan',
    description: 'Suggest a sprint plan based on backlog and capacity.',
    icon: Repeat,
    actionId: 'AI_SPRINT_PLAN',
  },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  projectId: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ProjectAiPanel: React.FC<Props> = ({ projectId, className }) => {
  const { activeWorkspaceId } = useWorkspaceStore();
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunSuggestion = useCallback(
    async (suggestion: AiSuggestion) => {
      setActiveSuggestion(suggestion.id);
      setLoading(true);
      setResult(null);
      setError(null);

      try {
        const res = await apiClient.post(
          '/commands/resolve',
          {
            organizationId: '',
            workspaceId: activeWorkspaceId,
            route: { pathname: `/projects/${projectId}` },
            entityContext: { projectId },
            actionId: suggestion.actionId,
          },
        );

        const data = res?.data?.data ?? res?.data;

        // Normalize response into our result shape
        setResult({
          summary: data?.summary || `${suggestion.label} results`,
          items: Array.isArray(data?.items)
            ? data.items.map((item: any) => ({
                taskId: item.taskId || item.id,
                title: item.title || item.label || 'Unnamed',
                reason: item.reason || item.description || '',
              }))
            : [],
        });
      } catch (err: any) {
        // Gracefully handle — AI is optional
        setError('AI suggestions are not available for this project yet.');
        setResult({
          summary: suggestion.label,
          items: [],
        });
      } finally {
        setLoading(false);
      }
    },
    [projectId, activeWorkspaceId],
  );

  const handleClearResult = () => {
    setActiveSuggestion(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <Sparkles className="h-4 w-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-900">AI Assistant</h3>
        <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-100 rounded-full">
          Read-only
        </span>
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-700">
          Suggestions are read-only previews. No changes are made until you explicitly confirm an action.
        </p>
      </div>

      {/* Suggestion cards or results */}
      <div className="p-4">
        {!result && !loading && (
          <div className="space-y-2">
            {PRESET_SUGGESTIONS.map((suggestion) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={suggestion.id}
                  onClick={() => handleRunSuggestion(suggestion)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors text-left group"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 shrink-0">
                    <Icon className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{suggestion.label}</p>
                    <p className="text-xs text-slate-500">{suggestion.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
            <span className="ml-2 text-sm text-slate-500">Analyzing project...</span>
          </div>
        )}

        {result && !loading && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900">{result.summary}</h4>
              <button
                onClick={handleClearResult}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {error && (
              <p className="text-xs text-amber-600 mb-2">{error}</p>
            )}

            {result.items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No items found.
              </p>
            ) : (
              <div className="space-y-2">
                {result.items.map((item, idx) => (
                  <div
                    key={item.taskId || idx}
                    className="flex items-start gap-2 p-2 rounded-md bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {item.title}
                      </p>
                      {item.reason && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectAiPanel;
