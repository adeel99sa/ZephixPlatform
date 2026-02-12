/**
 * ProjectDocumentsTab — Upload, list, delete documents for a project.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { isGuestUser } from '@/utils/roles';
import { toast } from 'sonner';
import { FileText, Upload, Trash2, Download, Paperclip } from 'lucide-react';
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  formatFileSize,
  type DocumentItem,
} from '@/features/documents/documents.api';
import { InlineLoadingState, EmptyStateCard } from '@/components/ui/states';

export const ProjectDocumentsTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { user } = useAuth();
  const isGuest = isGuestUser(user);
  const canUpload = !isGuest;

  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await listDocuments(projectId);
      setItems(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10 MB limit');
      return;
    }

    try {
      setUploading(true);
      await uploadDocument(projectId, file);
      toast.success('Document uploaded');
      loadDocs();
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    try {
      await deleteDocument(doc.id);
      toast.success('Document deleted');
      setItems((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  if (!projectId || !activeWorkspaceId) {
    return <div className="p-6 text-slate-500">No project selected.</div>;
  }

  return (
    <div data-testid="documents-root">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
          <span className="text-sm text-slate-400">({items.length})</span>
        </div>
        {canUpload && (
          <label
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 cursor-pointer"
            data-testid="doc-upload-btn"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload'}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
              data-testid="doc-file-input"
            />
          </label>
        )}
      </div>

      {/* Loading / Error */}
      {loading && <InlineLoadingState message="Loading documents..." />}
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <EmptyStateCard
          title="No documents uploaded"
          description="Upload documents to share files with your project team."
          variant="default"
          icon={FileText}
        />
      )}

      {/* List */}
      {!loading && items.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" data-testid="doc-list">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Name</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Type</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Size</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Uploaded</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                  data-testid="doc-row"
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-900 truncate max-w-[200px]">{doc.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{doc.mimeType.split('/').pop()}</td>
                  <td className="px-4 py-2 text-slate-500">{formatFileSize(doc.sizeBytes)}</td>
                  <td className="px-4 py-2 text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <a
                        href={`/api/work/documents/${doc.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-400 hover:text-indigo-600"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {canUpload && (
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1 text-slate-400 hover:text-red-600"
                          title="Delete"
                          data-testid="doc-delete-btn"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProjectDocumentsTab;
