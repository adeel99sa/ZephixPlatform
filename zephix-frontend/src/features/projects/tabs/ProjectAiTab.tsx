/**
 * ProjectAiTab — UX Step 12
 *
 * Project-scoped AI assistant panel.
 * Preset queries for quick project insights, plus a custom query input.
 * AI is read-only — it never writes without explicit user trigger.
 */

import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  Users,
  Target,
  CheckCircle2,
  Loader2,
  Send,
  ChevronRight,
} from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { api } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AiSuggestion {
  actionId: string;
  score: number;
  rationale: string;
  deepLink?: string;
}

interface AiResult {
  rankedActions: AiSuggestion[];
  blockedExplanations: Array<{
    actionId: string;
    reason: string;
    remediationActionIds: string[];
  }>;
  debug: {
    mode: string;
    latencyMs: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Preset queries                                                     */
/* ------------------------------------------------------------------ */

interface PresetQuery {
  id: string;
  label: string;
  query: string;
  icon: React.FC<{ className?: string }>;
  intentHint: string;
}

const PRESET_QUERIES: PresetQuery[] = [
  {
    id: 'blocked',
    label: 'What is blocked?',
    query: 'Show me blocked tasks and what is preventing progress',
    icon: AlertTriangle,
    intentHint: 'GOVERNANCE',
  },
  {
    id: 'overdue',
    label: 'What is overdue?',
    query: 'Show me overdue tasks and upcoming deadlines at risk',
    icon: Clock,
    intentHint: 'GOVERNANCE',
  },
  {
    id: 'unassigned',
    label: 'Unassigned work',
    query: 'Show me tasks that have no assignee and need attention',
    icon: Users,
    intentHint: 'GENERAL',
  },
  {
    id: 'progress',
    label: 'Project progress',
    query: 'Summarize project completion, phase progress, and health',
    icon: Target,
    intentHint: 'GENERAL',
  },
  {
    id: 'next-actions',
    label: 'Recommended actions',
    query: 'What are the most important things to do next on this project?',
    icon: CheckCircle2,
    intentHint: 'GENERAL',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ProjectAiTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();

  const [customQuery, setCustomQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(
    async (query: string, intentHint = 'GENERAL') => {
      if (!projectId || loading) return;
      setLoading(true);
      setError(null);
      setActiveQuery(query);
      setResult(null);

      try {
        const response = await api.post('/ai/assist', {
          route: {
            pathname: `/projects/${projectId}`,
          },
          entityContext: {
            projectId,
          },
          userQuery: query,
          intentHint,
        });

        const data = response.data?.data ?? response.data;
        setResult(data as AiResult);
      } catch (err: any) {
        console.error('AI assist failed:', err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'AI assistant is temporarily unavailable',
        );
      } finally {
        setLoading(false);
      }
    },
    [projectId, loading],
  );

  const handlePresetClick = (preset: PresetQuery) => {
    runQuery(preset.query, preset.intentHint);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customQuery.trim()) {
      runQuery(customQuery.trim());
    }
  };

  if (!projectId || !activeWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <p>Select a workspace and project to use the AI assistant.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            AI Assistant
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          Get AI-powered insights about your project. AI is read-only and never
          makes changes without your explicit action.
        </p>
      </div>

      {/* Preset queries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {PRESET_QUERIES.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              disabled={loading}
              className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all text-left group disabled:opacity-50"
            >
              <Icon className="h-4 w-4 text-slate-500 group-hover:text-indigo-600 shrink-0" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                {preset.label}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>

      {/* Custom query */}
      <form onSubmit={handleCustomSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="Ask a question about this project..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !customQuery.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Ask
          </button>
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
          <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
          <div>
            <p className="text-sm font-medium text-indigo-800">
              Analyzing project...
            </p>
            <p className="text-xs text-indigo-600">{activeQuery}</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">
            Unable to get AI response
          </p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Active query display */}
          {activeQuery && (
            <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
              <Sparkles className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-700">{activeQuery}</p>
            </div>
          )}

          {/* Ranked suggestions */}
          {result.rankedActions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Suggested Actions
              </h3>
              <div className="space-y-2">
                {result.rankedActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        {action.actionId.replace(/_/g, ' ').toLowerCase()}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {action.rationale}
                      </p>
                      {action.deepLink && (
                        <a
                          href={action.deepLink}
                          className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 inline-block"
                        >
                          Go to action &rarr;
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 shrink-0">
                      {Math.round(action.score * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocked explanations */}
          {result.blockedExplanations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2">
                Blocked Items
              </h3>
              <div className="space-y-2">
                {result.blockedExplanations.map((block, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <p className="text-sm font-medium text-red-800">
                      {block.actionId.replace(/_/g, ' ').toLowerCase()}
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {block.reason}
                    </p>
                    {block.remediationActionIds.length > 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        Fix:{' '}
                        {block.remediationActionIds
                          .map((id) => id.replace(/_/g, ' ').toLowerCase())
                          .join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {result.rankedActions.length === 0 &&
            result.blockedExplanations.length === 0 && (
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-sm text-slate-500">
                  No specific suggestions for this query. Try asking something
                  more specific.
                </p>
              </div>
            )}

          {/* Debug info */}
          {result.debug && (
            <div className="text-[10px] text-slate-400 flex items-center gap-3 pt-2">
              <span>Mode: {result.debug.mode}</span>
              <span>{result.debug.latencyMs}ms</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectAiTab;
