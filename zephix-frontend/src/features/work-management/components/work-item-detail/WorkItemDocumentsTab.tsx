import { FileText, Upload } from 'lucide-react';
import type { TaskDetailDto } from '../../api/taskDetail.api';

interface Props {
  detail: TaskDetailDto;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function WorkItemDocumentsTab({ detail, onFileUpload }: Props) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">Documents ({detail.documents.length})</h4>
        <label className="inline-flex items-center gap-1 cursor-pointer rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
          <Upload className="h-3 w-3" />
          Upload
          <input type="file" onChange={onFileUpload} className="hidden" data-testid="doc-upload-input" />
        </label>
      </div>
      {detail.documents.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No documents linked to this task</p>
      ) : (
        <div className="space-y-2">
          {detail.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded border p-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.title || doc.fileName}</p>
                  <p className="text-[10px] text-gray-400">{(doc.sizeBytes / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}