/**
 * Prompt 8: PMBOK-style gate decision (GO / NO_GO / CONDITIONAL_GO / RECYCLE / HOLD / KILL).
 * POST /api/projects/:projectId/gates/:gateDefinitionId/execute-decision
 */
import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { GateDecisionType } from '@/features/work-management/types/gate-decision.types';
import { useExecuteGateDecision } from '@/features/work-management/hooks/useExecuteGateDecision';

const DECISION_OPTIONS: { value: GateDecisionType; label: string }[] = [
  { value: GateDecisionType.GO, label: 'GO — advance / complete' },
  { value: GateDecisionType.NO_GO, label: 'NO-GO — reject gate' },
  { value: GateDecisionType.CONDITIONAL_GO, label: 'Conditional GO — route + conditions' },
  { value: GateDecisionType.RECYCLE, label: 'Recycle — new cycle' },
  { value: GateDecisionType.HOLD, label: 'Hold' },
  { value: GateDecisionType.KILL, label: 'Kill' },
];

export interface GateDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful submit (before onClose). Use to refetch gate status. */
  onSubmitted?: () => void;
  projectId: string;
  gateDefinitionId: string;
  gateName?: string;
  phaseName?: string;
  /** Phases available as CONDITIONAL_GO targets (typically excludes current phase). */
  nextPhaseOptions: Array<{ id: string; name: string }>;
}

export function GateDecisionModal({
  isOpen,
  onClose,
  onSubmitted,
  projectId,
  gateDefinitionId,
  gateName,
  phaseName,
  nextPhaseOptions,
}: GateDecisionModalProps) {
  const { mutateAsync, isPending } = useExecuteGateDecision();
  const [decision, setDecision] = useState<GateDecisionType>(GateDecisionType.GO);
  const [note, setNote] = useState('');
  const [nextPhaseId, setNextPhaseId] = useState('');
  const [conditionRows, setConditionRows] = useState<string[]>(['']);

  useEffect(() => {
    if (!isOpen) {
      setDecision(GateDecisionType.GO);
      setNote('');
      setNextPhaseId('');
      setConditionRows(['']);
    }
  }, [isOpen]);

  const title = [phaseName, gateName].filter(Boolean).join(' · ') || 'Gate decision';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (decision === GateDecisionType.CONDITIONAL_GO) {
      if (!nextPhaseId) {
        toast.error('Select a target phase for Conditional GO.');
        return;
      }
      const conditions = conditionRows
        .map((s) => s.trim())
        .filter(Boolean)
        .map((label, i) => ({ label, sortOrder: i }));
      if (conditions.length === 0) {
        toast.error('Add at least one condition.');
        return;
      }
      try {
        await mutateAsync({
          projectId,
          gateDefinitionId,
          payload: {
            decision,
            nextPhaseId,
            conditions,
            note: note.trim() || undefined,
          },
        });
        toast.success('Gate decision recorded');
        onSubmitted?.();
        window.dispatchEvent(new CustomEvent('task:changed', { detail: { projectId } }));
        window.dispatchEvent(new CustomEvent('plan:changed', { detail: { projectId } }));
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Request failed';
        toast.error(msg);
      }
      return;
    }

    try {
      await mutateAsync({
        projectId,
        gateDefinitionId,
        payload: {
          decision,
          note: note.trim() || undefined,
        },
      });
      toast.success('Gate decision recorded');
      onSubmitted?.();
      window.dispatchEvent(new CustomEvent('task:changed', { detail: { projectId } }));
      window.dispatchEvent(new CustomEvent('plan:changed', { detail: { projectId } }));
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      toast.error(msg);
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => !isPending && onClose()}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform rounded-lg bg-white p-6 text-left shadow-xl border border-gray-200">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Gate decision
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 mt-1">{title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !isPending && onClose()}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                    <select
                      value={decision}
                      onChange={(e) => setDecision(e.target.value as GateDecisionType)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      disabled={isPending}
                    >
                      {DECISION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {decision === GateDecisionType.CONDITIONAL_GO && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target phase
                        </label>
                        <select
                          value={nextPhaseId}
                          onChange={(e) => setNextPhaseId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          required
                          disabled={isPending}
                        >
                          <option value="">Select phase…</option>
                          {nextPhaseOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-gray-700">Conditions</label>
                          <button
                            type="button"
                            className="text-xs text-blue-600 hover:underline"
                            onClick={() => setConditionRows((r) => [...r, ''])}
                            disabled={isPending}
                          >
                            + Add condition
                          </button>
                        </div>
                        <div className="space-y-2">
                          {conditionRows.map((row, i) => (
                            <input
                              key={i}
                              type="text"
                              value={row}
                              onChange={(e) => {
                                const v = e.target.value;
                                setConditionRows((prev) =>
                                  prev.map((x, j) => (j === i ? v : x)),
                                );
                              }}
                              className="w-full px-3 py-2 border rounded-md text-sm"
                              placeholder={`Condition ${i + 1}`}
                              disabled={isPending}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note (optional)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      disabled={isPending}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? 'Submitting…' : 'Submit decision'}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
