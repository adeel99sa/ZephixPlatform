// ─────────────────────────────────────────────────────────────────────────────
// Templates Activation Panel — Phase 4.3
//
// Admin: Activate/deactivate templates.
// Member: View-only with request button.
// Used in Org Settings and Workspace Settings.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Power, PowerOff, Send, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  listActivations,
  governanceActivate,
  governanceDeactivate,
  requestActivation,
  type ActivationListItem,
} from './templateActivationGovernance.api';
import { listTemplates } from './templates.api';

interface Props {
  scope: 'ORG' | 'WORKSPACE';
  scopeId: string;
  isAdmin: boolean;
}

interface TemplateRow {
  id: string;
  name: string;
  category: string | null;
  activationStatus: 'ACTIVE' | 'DEACTIVATED' | 'NOT_ACTIVATED';
  activatedBy: string | null;
  activatedAt: string | null;
  activationId: string | null;
}

export function TemplatesActivationPanel({ scope, scopeId, isAdmin }: Props) {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [templates, activations] = await Promise.all([
        listTemplates(),
        listActivations(scope, scopeId),
      ]);

      const activationMap = new Map<string, ActivationListItem>();
      for (const a of activations) {
        activationMap.set(a.templateId, a);
      }

      const merged: TemplateRow[] = templates.map((t) => {
        const activation = activationMap.get(t.id);
        return {
          id: t.id,
          name: t.name,
          category: t.category || null,
          activationStatus: activation
            ? activation.status === 'ACTIVE'
              ? 'ACTIVE'
              : 'DEACTIVATED'
            : 'NOT_ACTIVATED',
          activatedBy: activation?.activatedBy || null,
          activatedAt: activation?.activatedAt || null,
          activationId: activation?.id || null,
        };
      });

      setRows(merged);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [scope, scopeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleActivate = async (templateId: string) => {
    setBusyId(templateId);
    try {
      await governanceActivate(templateId, scope, scopeId);
      toast.success('Template activated');
      await loadData();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Failed to activate template',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDeactivate = async (templateId: string) => {
    setBusyId(templateId);
    try {
      await governanceDeactivate(templateId, scope, scopeId);
      toast.success('Template deactivated');
      await loadData();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'TEMPLATE_DEACTIVATION_BLOCKED_DEPENDENCIES') {
        toast.error(
          err?.response?.data?.message ||
            'Cannot deactivate: dependencies exist',
        );
      } else {
        toast.error(
          err?.response?.data?.message || 'Failed to deactivate template',
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleRequest = async (templateId: string) => {
    setBusyId(templateId);
    try {
      await requestActivation(templateId, scope, scopeId);
      toast.success('Activation request sent to admins');
    } catch {
      toast.error('Failed to send activation request');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Power className="h-5 w-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Template Activations
        </h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {isAdmin
          ? 'Manage which templates are active for this scope. Deactivation is blocked when dependent objects exist.'
          : 'View active templates. Request activation from your admin.'}
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          No templates available.
        </p>
      ) : (
        <div className="divide-y divide-gray-100 border rounded-lg">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between px-4 py-3"
              data-testid={`template-row-${row.id}`}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {row.name}
                </span>
                <span className="text-xs text-gray-400">
                  {row.category || 'General'}
                  {row.activatedAt &&
                    ` · Activated ${new Date(row.activatedAt).toLocaleDateString()}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Status badge */}
                {row.activationStatus === 'ACTIVE' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    <Check className="h-3 w-3" />
                    Active
                  </span>
                ) : row.activationStatus === 'DEACTIVATED' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    <X className="h-3 w-3" />
                    Deactivated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    Not activated
                  </span>
                )}

                {/* Action buttons */}
                {isAdmin ? (
                  row.activationStatus === 'ACTIVE' ? (
                    <button
                      onClick={() => handleDeactivate(row.id)}
                      disabled={busyId === row.id}
                      data-testid={`deactivate-${row.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                    >
                      {busyId === row.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <PowerOff className="h-3 w-3" />
                      )}
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(row.id)}
                      disabled={busyId === row.id}
                      data-testid={`activate-${row.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                    >
                      {busyId === row.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Power className="h-3 w-3" />
                      )}
                      Activate
                    </button>
                  )
                ) : row.activationStatus !== 'ACTIVE' ? (
                  <button
                    onClick={() => handleRequest(row.id)}
                    disabled={busyId === row.id}
                    data-testid={`request-${row.id}`}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    {busyId === row.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    Request
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
