import { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkles, AlertCircle, Loader2, Info } from 'lucide-react';


import { getAiSuggestions, type AiAssistPayload } from './aiAssistant.api';
import type {
  AiAssistResponse,
  RankedAction,
  BlockedExplanation,
  RankedTemplate,
} from './types';

import type { CommandAction, CommandActionId } from '@/features/command-palette/commandPalette.api';

// ─── Props ───────────────────────────────────────────────────────────────────

interface AiSuggestionsPanelProps {
  route: { pathname: string; search?: string };
  entityContext?: Record<string, string>;
  userQuery: string;
  /** All actions from cmd+K resolver — used to map actionId back to full action */
  allActions: CommandAction[];
  onExecute: (action: CommandAction, confirmed?: boolean) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AiSuggestionsPanel({
  route,
  entityContext,
  userQuery,
  allActions,
  onExecute,
}: AiSuggestionsPanelProps) {
  const [response, setResponse] = useState<AiAssistResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      setLoading(true);
      setError(false);

      const payload: AiAssistPayload = {
        route,
        entityContext,
        userQuery: query || undefined,
      };

      try {
        const result = await getAiSuggestions(payload);
        setResponse(result);
      } catch {
        setError(true);
        setResponse(null);
      } finally {
        setLoading(false);
      }
    },
    [route, entityContext],
  );

  // Fetch on mount and debounced on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(userQuery);
    }, userQuery ? 400 : 0); // Immediate on first load, debounced on typing
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userQuery, fetchSuggestions]);

  // ─── Helpers ─────────────────────────────────────────────────────────

  const findAction = (actionId: CommandActionId): CommandAction | undefined =>
    allActions.find(a => a.id === actionId);

  const formatScore = (score: number): string => `${Math.round(score * 100)}%`;

  // ─── Render ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="px-3 py-2 text-xs text-neutral-400 flex items-center gap-1.5">
        <Info className="h-3 w-3" />
        AI suggestions unavailable
      </div>
    );
  }

  if (loading && !response) {
    return (
      <div className="px-3 py-2 text-xs text-neutral-400 flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading suggestions...
      </div>
    );
  }

  if (!response) return null;

  const { rankedActions, blockedExplanations, rankedTemplates, debug } = response;
  const hasContent = rankedActions.length > 0 || blockedExplanations.length > 0 || rankedTemplates.length > 0;

  if (!hasContent) return null;

  return (
    <div className="border-t border-neutral-100" data-testid="ai-suggestions-panel">
      {/* Header */}
      <div className="px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
          <Sparkles className="h-3 w-3" />
          AI Suggestions
          {loading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        </div>
        <span
          className="text-[10px] text-neutral-400 bg-neutral-50 px-1.5 py-0.5 rounded"
          data-testid="ai-mode-badge"
        >
          {debug.mode === 'FALLBACK' ? 'Fallback mode' : `AI · ${debug.model || 'unknown'}`}
        </span>
      </div>

      {/* Ranked actions — top 3 */}
      {rankedActions.length > 0 && (
        <div className="px-2 pb-1">
          {rankedActions.slice(0, 3).map((ra: RankedAction) => {
            const action = findAction(ra.actionId);
            if (!action) return null;
            return (
              <button
                key={ra.actionId}
                onClick={() => onExecute(action)}
                className="w-full flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-left hover:bg-indigo-50 transition-colors cursor-pointer"
                data-testid={`ai-action-${ra.actionId}`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{action.label}</span>
                  <span className="text-xs text-neutral-400 truncate">{ra.rationale}</span>
                </div>
                <span className="text-[10px] text-indigo-500 font-medium ml-2 shrink-0">
                  {formatScore(ra.score)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Blocked explanations — top 3 */}
      {blockedExplanations.length > 0 && (
        <div className="px-3 pb-1.5">
          <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Blocked
          </div>
          {blockedExplanations.slice(0, 3).map((be: BlockedExplanation) => (
            <div
              key={be.actionId}
              className="text-xs text-neutral-600 mb-1 flex items-start gap-1.5"
              data-testid={`ai-blocked-${be.actionId}`}
            >
              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-medium">{be.actionId.replace(/_/g, ' ')}</span>
                <span className="text-neutral-400"> — {be.reason}</span>
                {be.remediationActionIds.length > 0 && (
                  <div className="mt-0.5 text-[10px] text-indigo-500">
                    Fix: {be.remediationActionIds.map(id => {
                      const act = findAction(id);
                      return act ? act.label : id;
                    }).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ranked templates — top 2 */}
      {rankedTemplates.length > 0 && (
        <div className="px-2 pb-1">
          <div className="px-1 text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Templates
          </div>
          {rankedTemplates.slice(0, 2).map((rt: RankedTemplate) => {
            const action = findAction(rt.templateActionId);
            if (!action) return null;
            return (
              <button
                key={rt.templateActionId}
                onClick={() => onExecute(action)}
                className="w-full flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-left hover:bg-indigo-50 transition-colors cursor-pointer"
                data-testid={`ai-template-${rt.templateActionId}`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{action.label}</span>
                  <span className="text-xs text-neutral-400 truncate">{rt.rationale}</span>
                </div>
                <span className="text-[10px] text-indigo-500 font-medium ml-2 shrink-0">
                  {formatScore(rt.score)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
