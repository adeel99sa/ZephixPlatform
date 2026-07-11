/**
 * TC-F3 — SaveAsTemplateModal
 *
 * Project ⋯ → Save as template (platform ADMIN only at the menu).
 * Manifest checkboxes + name / description / category → POST save-as-template.
 * Success toast links into Template Center “Your templates” tier.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';

import { PROJECT_TEMPLATE_CATEGORIES } from '@/features/templates/categories';
import { projectsApi } from '../projects.api';
import {
  SAVE_AS_TEMPLATE_DIALOG_DEFAULTS,
  MANIFEST_CHECKBOX_META,
  buildSaveAsTemplatePayload,
  type SaveAsTemplateManifest,
} from '../saveAsTemplateManifest';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onSaved?: (templateId: string, templateName: string) => void;
}

export function SaveAsTemplateModal({
  open,
  onClose,
  projectId,
  projectName,
  onSaved,
}: Props) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(PROJECT_TEMPLATE_CATEGORIES[0]);
  const [manifest, setManifest] = useState<SaveAsTemplateManifest>({
    ...SAVE_AS_TEMPLATE_DIALOG_DEFAULTS,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(`${projectName} Template`);
      setDescription('');
      setCategory(PROJECT_TEMPLATE_CATEGORIES[0]);
      setManifest({ ...SAVE_AS_TEMPLATE_DIALOG_DEFAULTS });
      setSubmitting(false);
    }
  }, [open, projectName]);

  if (!open) return null;

  const toggle = (key: keyof SaveAsTemplateManifest) => {
    setManifest((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      const payload = buildSaveAsTemplatePayload({
        name,
        description,
        category,
        manifest,
      });
      const result = await projectsApi.saveProjectAsTemplate(projectId, payload);
      try {
        window.dispatchEvent(new CustomEvent('zephix:templates:invalidate'));
      } catch {
        /* ignore — non-browser env */
      }
      toast.success(`Saved as template: ${result.name}`, {
        action: {
          label: 'View in Template Center',
          onClick: () => {
            navigate('/templates?tier=Your%20templates');
          },
        },
      });
      onSaved?.(result.id, result.name);
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[5100] flex items-center justify-center bg-black/40 p-4"
      data-testid="save-as-template-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <BookmarkPlus className="h-5 w-5 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Save as template</h2>
        </div>

        <div className="space-y-5 px-6 py-5">
          <p className="text-xs text-slate-500">
            Choose what structure to capture. Live work data (assignees, dates, comments) is never
            included.
          </p>

          <fieldset className="space-y-2" data-testid="save-as-template-manifest">
            <legend className="mb-2 text-sm font-medium text-slate-800">Include in template</legend>
            {MANIFEST_CHECKBOX_META.map((item) => (
              <div key={item.key}>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={manifest[item.key]}
                    onChange={() => toggle(item.key)}
                    disabled={submitting}
                    data-testid={`save-as-template-include-${item.key}`}
                  />
                    <span>
                    <span className="font-medium">{item.label}</span>
                    {item.warning ? (
                      <span
                        className="mt-1 block text-xs text-amber-700"
                        data-testid="save-as-template-sample-tasks-warning"
                      >
                        {item.warning}
                      </span>
                    ) : null}
                  </span>
                </label>
              </div>
            ))}
          </fieldset>

          <div>
            <label htmlFor="sat-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Template name
            </label>
            <input
              id="sat-name"
              data-testid="save-as-template-name"
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="sat-description"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="sat-description"
              data-testid="save-as-template-description"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="sat-category"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Category
            </label>
            <select
              id="sat-category"
              data-testid="save-as-template-category"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
            >
              {PROJECT_TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="save-as-template-submit"
            onClick={() => void handleSubmit()}
            disabled={submitting || !name.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
