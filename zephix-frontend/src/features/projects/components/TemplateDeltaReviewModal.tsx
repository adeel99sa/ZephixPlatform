/**
 * Prompt 9: PM review of master template delta (ACCEPT / REJECT).
 */
import { Fragment, useMemo, type ReactElement } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/api/errors';
import type { TemplateDeltaReview } from '@/features/projects/template-binding.types';
import {
  getComputedDeltaRecord,
  humanizeTemplateComputedDelta,
} from '@/features/projects/utils/humanizeTemplateComputedDelta';
import {
  useResolveTemplateDeltaMutation,
  useTemplateDeltaReviews,
} from '@/features/projects/hooks';

export interface TemplateDeltaReviewModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** When false, user can read the summary but cannot accept/reject. */
  canResolve: boolean;
  onResolved?: () => void;
}

export function TemplateDeltaReviewModal({
  open,
  onClose,
  projectId,
  canResolve,
  onResolved,
}: TemplateDeltaReviewModalProps): ReactElement {
  const { data: reviews, isLoading, isError, error, refetch } = useTemplateDeltaReviews(
    projectId,
    { enabled: open },
  );

  const pendingReview = useMemo(() => {
    if (!reviews?.length) return null;
    return reviews.find((r) => r.status === 'PENDING') ?? reviews[0] ?? null;
  }, [reviews]);

  const summaryLines = useMemo(() => {
    if (!pendingReview) return [];
    return humanizeTemplateComputedDelta(getComputedDeltaRecord(pendingReview));
  }, [pendingReview]);

  const { mutateAsync, isPending } = useResolveTemplateDeltaMutation();

  async function resolve(action: 'ACCEPT' | 'REJECT'): Promise<void> {
    if (!pendingReview) {
      toast.error('No pending template review to resolve.');
      return;
    }
    try {
      await mutateAsync({
        projectId,
        payload: { action, review_id: pendingReview.id },
      });
      toast.success(
        action === 'ACCEPT'
          ? 'Template changes accepted'
          : 'Template changes rejected',
      );
      onResolved?.();
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Transition appear show={open} as={Fragment}>
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
              <Dialog.Panel className="w-full max-w-2xl transform rounded-lg border border-slate-200 bg-white p-6 text-left shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-slate-900">
                      Review template changes
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-slate-600">
                      Compare the proposed master template updates before applying them to this
                      project.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !isPending && onClose()}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                    Loading review…
                  </div>
                ) : isError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {error instanceof Error ? error.message : 'Failed to load review'}
                    <button
                      type="button"
                      className="ml-2 underline"
                      onClick={() => void refetch()}
                    >
                      Retry
                    </button>
                  </div>
                ) : !pendingReview ? (
                  <p className="text-sm text-slate-600">
                    There is no pending template review for this project. If the banner still
                    shows out of date, refresh the page.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <ul className="list-disc space-y-2 pl-5 text-sm text-slate-800">
                      {summaryLines.map((line, idx) => (
                        <li key={`${idx}-${line.slice(0, 24)}`}>{line}</li>
                      ))}
                    </ul>
                    <RawDeltaDetails review={pendingReview} />
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => !isPending && onClose()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canResolve || !pendingReview || isPending}
                    onClick={() => void resolve('REJECT')}
                  >
                    Reject changes
                  </Button>
                  <Button
                    type="button"
                    disabled={!canResolve || !pendingReview || isPending}
                    onClick={() => void resolve('ACCEPT')}
                  >
                    Accept all changes
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function RawDeltaDetails({ review }: { review: TemplateDeltaReview }): ReactElement {
  const raw = getComputedDeltaRecord(review);
  const json = JSON.stringify(raw, null, 2);
  return (
    <details className="rounded-md border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-slate-700">
        Technical details (JSON)
      </summary>
      <pre className="max-h-48 overflow-auto border-t border-slate-200 p-3 text-xs text-slate-800">
        {json}
      </pre>
    </details>
  );
}
