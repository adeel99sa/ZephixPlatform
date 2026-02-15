/**
 * ProjectDocumentsTab
 *
 * List / create / edit / delete project documents (JSON content, versioned).
 * Matches Wave 3A backend: work/workspaces/:wsId/projects/:projId/documents
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, X, FileText, Pencil, Trash2, Save } from 'lucide-react';
import {
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from '@/features/documents/documents.api';
import type {
  Document,
  CreateDocumentInput,
  UpdateDocumentInput,
} from '@/features/documents/types';

export const ProjectDocumentsTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [items, setItems] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await listDocuments(projectId);
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!projectId) return;
    try {
      await deleteDocument(projectId, id);
      setItems((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="documents-root">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
          <span className="text-sm text-slate-400">({items.length})</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Document
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {showCreate && projectId && (
        <CreateDocForm
          projectId={projectId}
          onCreated={() => { setShowCreate(false); load(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No documents yet. Create one to get started.
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Updated</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200" data-testid="doc-list">
              {items.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50" data-testid="doc-row">
                  {editingId === doc.id ? (
                    <td colSpan={4} className="p-0">
                      <EditDocForm
                        projectId={projectId!}
                        doc={doc}
                        onSaved={() => { setEditingId(null); load(); }}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[250px] truncate">
                        {doc.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600" data-testid="doc-version">
                        v{doc.version}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingId(doc.id)}
                            title="Edit"
                            className="p-1.5 rounded text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            title="Delete"
                            className="p-1.5 rounded text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid="doc-delete-btn"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

function CreateDocForm({
  projectId,
  onCreated,
  onCancel,
}: {
  projectId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [contentStr, setContentStr] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let parsedContent: Record<string, unknown>;
      try {
        parsedContent = JSON.parse(contentStr);
      } catch {
        setError('Content must be valid JSON');
        setSaving(false);
        return;
      }
      const input: CreateDocumentInput = {
        title: title.trim(),
        content: parsedContent,
      };
      await createDocument(projectId, input);
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4" data-testid="doc-create-form">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">New Document</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Document title"
            data-testid="doc-title-input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Content (JSON)</label>
          <textarea
            value={contentStr}
            onChange={(e) => setContentStr(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            data-testid="doc-content-input"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            data-testid="doc-create-submit"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditDocForm({
  projectId,
  doc,
  onSaved,
  onCancel,
}: {
  projectId: string;
  doc: Document;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [contentStr, setContentStr] = useState(
    doc.content ? JSON.stringify(doc.content, null, 2) : '{}',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let parsedContent: Record<string, unknown>;
      try {
        parsedContent = JSON.parse(contentStr);
      } catch {
        setError('Content must be valid JSON');
        setSaving(false);
        return;
      }
      const input: UpdateDocumentInput = {};
      if (title !== doc.title) input.title = title.trim();
      input.content = parsedContent;
      await updateDocument(projectId, doc.id, input);
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-indigo-50/30" data-testid="doc-edit-form">
      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500"
            data-testid="doc-edit-title"
          />
        </div>
        <textarea
          value={contentStr}
          onChange={(e) => setContentStr(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono focus:border-indigo-500"
          data-testid="doc-edit-content"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-1 text-xs text-slate-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
            data-testid="doc-edit-save"
          >
            <Save className="h-3 w-3" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectDocumentsTab;
